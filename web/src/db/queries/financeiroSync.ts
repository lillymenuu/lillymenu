import "server-only";
import { and, eq, gte, lte, or, sql, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pedidos, pedidoPagamentos, financialCategories, financialAccounts, paymentMethods, financialTransactions, configuracoes } from "@/db/schema";
import { criarLancamento, atualizarLancamento, excluirLancamento, listarLancamentosFiltrados, listarCategoriasFinanceiras, listarContasFinanceiras, listarFormasPagamento, type FiltrosLancamentos, type Lancamento } from "@/db/queries/financeiroCore";
import { codigoDisplay, pedidoCodigoBase } from "@/db/queries/pedidosAdmin";
import { dataFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de services/SaleFinancialIntegrationService.php: gera/atualiza/
 * remove os lancamentos financeiros de receita a partir dos pedidos
 * (uma linha por forma de pagamento usada), e registra pagamentos de
 * fiado como receita tambem. Cada lancamento e criado/atualizado/apagado
 * via financeiroCore.ts (cada chamada e sua propria transacao — mesma
 * granularidade do PHP, que tambem nao envolve o sync inteiro numa unica
 * transacao).
 */

const ROTULOS_PAGAMENTO: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Credito",
  debito: "Debito",
  voucher: "Voucher",
  outros: "Outros",
  outro: "Outros",
  fiado: "Fiado",
  resgate: "Resgate",
  cashback: "Cashback",
};

function normalizar(valor: string): string {
  const semAcento = valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return semAcento.replace(/[^a-z0-9]+/g, "");
}

function nomeExibicaoPagamento(nome: string): string {
  const limpo = nome.trim();
  if (!limpo) return "Vendas";
  const normalizado = normalizar(limpo);
  if (ROTULOS_PAGAMENTO[normalizado]) return ROTULOS_PAGAMENTO[normalizado];
  const semEspacosDuplicados = limpo.replace(/\s+/g, " ");
  return semEspacosDuplicados.replace(/\p{L}+/gu, (palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase());
}

async function buscarCategoriaPorNome(lojaId: number, name: string, type: "income" | "expense") {
  const [linha] = await db
    .select()
    .from(financialCategories)
    .where(and(eq(financialCategories.tenant_id, lojaId), eq(financialCategories.type, type), sql`lower(${financialCategories.name}) = lower(${name})`))
    .orderBy(financialCategories.id)
    .limit(1);
  return linha ?? null;
}

async function resolverCategoriaVendas(lojaId: number) {
  const existente = await buscarCategoriaPorNome(lojaId, "Vendas", "income");
  if (existente) return existente;

  const [raiz] = await db
    .select({ id: financialCategories.id })
    .from(financialCategories)
    .where(and(eq(financialCategories.tenant_id, lojaId), sql`${financialCategories.parent_id} is null`, eq(financialCategories.type, "income"), eq(financialCategories.active, true)))
    .orderBy(financialCategories.name)
    .limit(1);

  const [criada] = await db
    .insert(financialCategories)
    .values({ tenant_id: lojaId, name: "Vendas", type: "income", parent_id: raiz?.id ?? null, active: true })
    .returning();
  return criada;
}

async function buscarContaPorNome(lojaId: number, name: string) {
  const [linha] = await db
    .select()
    .from(financialAccounts)
    .where(and(eq(financialAccounts.tenant_id, lojaId), sql`lower(${financialAccounts.name}) = lower(${name})`))
    .orderBy(financialAccounts.id)
    .limit(1);
  return linha ?? null;
}

async function resolverContaVendasParaPagamento(lojaId: number, paymentName: string) {
  const accountName = nomeExibicaoPagamento(paymentName);
  const conta = await buscarContaPorNome(lojaId, accountName);
  if (conta) {
    if (!conta.active) {
      await db.update(financialAccounts).set({ active: true, updated_at: sql`now()` }).where(and(eq(financialAccounts.id, conta.id), eq(financialAccounts.tenant_id, lojaId)));
      conta.active = true;
    }
    return conta;
  }

  const [criada] = await db.insert(financialAccounts).values({ tenant_id: lojaId, name: accountName, initial_balance: 0, current_balance: 0, active: true }).returning();
  return criada;
}

async function buscarFormaPagamentoPorNome(lojaId: number, name: string) {
  const [linha] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.tenant_id, lojaId), sql`lower(${paymentMethods.name}) = lower(${name})`))
    .orderBy(paymentMethods.id)
    .limit(1);
  return linha ?? null;
}

async function resolverFormaPagamento(lojaId: number, nomeBruto: string) {
  const name = nomeExibicaoPagamento(nomeBruto);
  const existente = await buscarFormaPagamentoPorNome(lojaId, name);
  if (existente) return existente;
  const [criada] = await db.insert(paymentMethods).values({ tenant_id: lojaId, name, active: true }).returning();
  return criada;
}

async function buscarPedido(lojaId: number, orderId: number) {
  const [linha] = await db
    .select({ id: pedidos.id, lojaId: pedidos.loja_id, status: pedidos.status, total: pedidos.total, formaPagamento: pedidos.forma_pagamento, criadoEm: pedidos.criado_em })
    .from(pedidos)
    .where(and(eq(pedidos.id, orderId), eq(pedidos.loja_id, lojaId)))
    .limit(1);
  return linha ?? null;
}

function statusCancelado(status: string): boolean {
  const n = normalizar(status);
  return n === "cancelado" || n === "cancelada";
}

function podeGerarReceita(order: { status: string; total: number | null }): boolean {
  if (statusCancelado(order.status)) return false;
  return (order.total ?? 0) > 0;
}

async function buscarPagamentosPedido(lojaId: number, orderId: number): Promise<{ forma: string; valor: number }[]> {
  const linhas = await db
    .select({ forma: pedidoPagamentos.forma, valor: sql<string>`sum(${pedidoPagamentos.valor})` })
    .from(pedidoPagamentos)
    .where(and(eq(pedidoPagamentos.pedido_id, orderId), eq(pedidoPagamentos.loja_id, lojaId)))
    .groupBy(pedidoPagamentos.forma)
    .orderBy(pedidoPagamentos.forma);
  return linhas.map((l) => ({ forma: l.forma, valor: Number(l.valor) }));
}

async function buscarTransacoesExistentesDoPedido(lojaId: number, orderId: number): Promise<(typeof financialTransactions.$inferSelect)[]> {
  const description = `Receita gerada pela venda #${orderId}`;
  const legacyNotes = `[pedido_finalizado:${orderId}][forma:%`;
  return db
    .select()
    .from(financialTransactions)
    .where(and(eq(financialTransactions.tenant_id, lojaId), eq(financialTransactions.type, "income"), or(eq(financialTransactions.order_id, orderId), eq(financialTransactions.description, description), sql`${financialTransactions.notes} like ${legacyNotes}`)))
    .orderBy(financialTransactions.id);
}

type PayloadDesejado = {
  orderId: number;
  accountId: number;
  categoryId: number;
  paymentMethodId: number;
  type: "income";
  description: string;
  amount: number;
  transactionDate: string;
  referenceMonth: number;
  referenceYear: number;
  notes: string;
};

async function montarTransacoesDesejadas(lojaId: number, order: { id: number; total: number | null; formaPagamento: string; criadoEm: string | null }): Promise<Map<number, PayloadDesejado>> {
  const categoria = await resolverCategoriaVendas(lojaId);
  if (!categoria) return new Map();

  const data = order.criadoEm ? order.criadoEm.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const referenceDate = new Date(`${data}T12:00:00`);
  let pagamentos = await buscarPagamentosPedido(lojaId, order.id);
  if (pagamentos.length === 0) {
    pagamentos = [{ forma: order.formaPagamento || "Venda", valor: order.total ?? 0 }];
  }

  const desejadas = new Map<number, PayloadDesejado>();
  const base = await pedidoCodigoBase(lojaId);

  for (const pagamento of pagamentos) {
    const amount = Math.round(pagamento.valor * 100) / 100;
    if (amount <= 0) continue;
    const paymentName = (pagamento.forma || "Venda").trim();
    if (normalizar(paymentName) === "fiado") continue;

    const conta = await resolverContaVendasParaPagamento(lojaId, paymentName);
    const formaPagamento = await resolverFormaPagamento(lojaId, paymentName);
    if (!conta || !formaPagamento) continue;

    const paymentLabel = nomeExibicaoPagamento(paymentName);
    desejadas.set(formaPagamento.id, {
      orderId: order.id,
      accountId: conta.id,
      categoryId: categoria.id,
      paymentMethodId: formaPagamento.id,
      type: "income",
      description: `Receita gerada pela venda #${codigoDisplay(order.id, base)}`,
      amount,
      transactionDate: data,
      referenceMonth: referenceDate.getMonth() + 1,
      referenceYear: referenceDate.getFullYear(),
      notes: `Integracao automatica de vendas - ${paymentLabel}`,
    });
  }

  return desejadas;
}

export type ResultadoSync = { created: number; updated: number; deleted: number };

export async function syncOrderRevenue(lojaId: number, orderId: number): Promise<ResultadoSync> {
  const order = await buscarPedido(lojaId, orderId);
  if (!order || !podeGerarReceita(order)) return { created: 0, updated: 0, deleted: 0 };

  const desejadas = await montarTransacoesDesejadas(lojaId, order);
  if (desejadas.size === 0) return { created: 0, updated: 0, deleted: 0 };

  const existentes = await buscarTransacoesExistentesDoPedido(lojaId, orderId);
  const existentesPorForma = new Map<number, typeof financialTransactions.$inferSelect>();
  for (const item of existentes) {
    if (item.payment_method_id) existentesPorForma.set(item.payment_method_id, item);
  }

  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const [metodoId, payload] of desejadas) {
    const atual = existentesPorForma.get(metodoId);
    if (atual) {
      await atualizarLancamento(lojaId, atual.id, payload);
      updated++;
      existentesPorForma.delete(metodoId);
    } else {
      await criarLancamento(lojaId, payload);
      created++;
    }
  }

  for (const stale of existentesPorForma.values()) {
    await excluirLancamento(lojaId, stale.id);
    deleted++;
  }

  return { created, updated, deleted };
}

export async function syncFinalizedOrder(lojaId: number, orderId: number): Promise<ResultadoSync> {
  return syncOrderRevenue(lojaId, orderId);
}

export async function reverseCanceledOrder(lojaId: number, orderId: number): Promise<{ deleted: number }> {
  const existentes = await buscarTransacoesExistentesDoPedido(lojaId, orderId);
  let deleted = 0;
  for (const item of existentes) {
    if (await excluirLancamento(lojaId, item.id)) deleted++;
  }
  return { deleted };
}

export type PagamentoFiado = { valor: number; forma?: string; data?: string; clienteNome?: string; fiadoLancamentoId?: number };

export async function recordFiadoPayment(lojaId: number, pagamento: PagamentoFiado): Promise<{ created: number }> {
  const valor = Math.round((pagamento.valor ?? 0) * 100) / 100;
  if (valor <= 0) return { created: 0 };

  const categoria = await resolverCategoriaVendas(lojaId);
  if (!categoria) return { created: 0 };

  const paymentName = (pagamento.forma ?? "outro").trim();
  const conta = await resolverContaVendasParaPagamento(lojaId, paymentName);
  const formaPagamento = await resolverFormaPagamento(lojaId, paymentName);
  if (!conta || !formaPagamento) return { created: 0 };

  const data = pagamento.data?.trim() || new Date().toISOString().slice(0, 10);
  const referenceDate = new Date(`${data}T12:00:00`);
  const clienteNome = (pagamento.clienteNome ?? "").trim();
  const fiadoLancamentoId = pagamento.fiadoLancamentoId ?? 0;

  await criarLancamento(lojaId, {
    orderId: null,
    accountId: conta.id,
    categoryId: categoria.id,
    paymentMethodId: formaPagamento.id,
    type: "income",
    description: `Recebimento de fiado${clienteNome ? ` - ${clienteNome}` : ""}`,
    amount: valor,
    transactionDate: data,
    referenceMonth: referenceDate.getMonth() + 1,
    referenceYear: referenceDate.getFullYear(),
    notes: `Integracao automatica de fiado - ${nomeExibicaoPagamento(paymentName)}${fiadoLancamentoId ? ` [fiado_lancamento:${fiadoLancamentoId}]` : ""}`,
  });

  return { created: 1 };
}

export type ResultadoSyncPeriodo = ResultadoSync & { orders: number };

export async function syncFinalizedOrdersForPeriod(lojaId: number, referenceMonth: number, referenceYear: number): Promise<ResultadoSyncPeriodo> {
  const inicio = `${referenceYear}-${String(referenceMonth).padStart(2, "0")}-01`;
  const fimData = new Date(referenceYear, referenceMonth, 0).getDate();
  const fim = `${referenceYear}-${String(referenceMonth).padStart(2, "0")}-${String(fimData).padStart(2, "0")}`;

  const idsLinhas = await db
    .select({ id: pedidos.id })
    .from(pedidos)
    .where(and(eq(pedidos.loja_id, lojaId), eq(pedidos.status, "finalizado"), gte(pedidos.criado_em, `${inicio} 00:00:00`), lte(pedidos.criado_em, `${fim} 23:59:59`)))
    .orderBy(pedidos.id);

  const totais: ResultadoSyncPeriodo = { created: 0, updated: 0, deleted: 0, orders: 0 };
  for (const { id } of idsLinhas) {
    const resultado = await syncFinalizedOrder(lojaId, id);
    totais.created += resultado.created;
    totais.updated += resultado.updated;
    totais.deleted += resultado.deleted;
    totais.orders++;
  }
  return totais;
}

/*
 * Equivalente de financialSyncCurrentMonthSalesIfNeeded (admin/helpers/financial_module.php):
 * só sincroniza o mes/ano atual (nunca um periodo passado navegado no
 * filtro), com throttle persistente de 5 minutos por loja guardado em
 * configuracoes (chave fin_sync_last_{mes}_{ano}) — evita rodar o sync
 * em toda carga de pagina.
 */
async function syncMesAtualSeNecessario(lojaId: number, mes: number, ano: number): Promise<void> {
  const hoje = dataFortaleza();
  const mesAtual = Number(hoje.slice(5, 7));
  const anoAtual = Number(hoje.slice(0, 4));
  if (mes !== mesAtual || ano !== anoAtual) return;

  const chave = `fin_sync_last_${mes}_${ano}`;
  const [config] = await db.select({ valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.chave, chave), eq(configuracoes.loja_id, lojaId))).limit(1);
  const agora = Math.floor(Date.now() / 1000);
  if (config && agora - Number(config.valor) < 300) return;

  try {
    await syncFinalizedOrdersForPeriod(lojaId, mes, ano);
  } catch (e) {
    console.error("[financeiro] falha ao reconciliar vendas finalizadas do mes atual", e);
    return;
  }

  await db.insert(configuracoes).values({ loja_id: lojaId, chave, valor: String(agora) }).onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor: String(agora) } });
}

export type FinanceiroYearOptions = number[];

async function opcoesAnos(lojaId: number, anoAtual: number, anoSelecionado: number): Promise<FinanceiroYearOptions> {
  const linhas = await db.selectDistinct({ ano: financialTransactions.reference_year }).from(financialTransactions).where(eq(financialTransactions.tenant_id, lojaId)).orderBy(desc(financialTransactions.reference_year));
  let anos = linhas.map((l) => l.ano);
  if (anos.length === 0) anos = [anoAtual];
  if (!anos.includes(anoSelecionado)) anos.push(anoSelecionado);
  return [...new Set(anos)].sort((a, b) => b - a);
}

export type LancamentoDetalhado = Lancamento & { accountName: string | null; categoryName: string | null; paymentMethodName: string | null };

export type DetalheLancamentosInput = { mes?: number; ano?: number; tipo?: string; categoriaId?: number; contaId?: number; page?: number };

export type DetalheLancamentosResultado = {
  mes: number;
  ano: number;
  anos: number[];
  tipo: string;
  categoriaId: number;
  contaId: number;
  page: number;
  perPage: number;
  total: number;
  totalPaginas: number;
  lancamentos: LancamentoDetalhado[];
  categorias: { id: number; name: string; type: "income" | "expense" }[];
  contas: { id: number; name: string }[];
  formasPagamento: { id: number; name: string }[];
};

/* Equivalente de admin/api/v1/financeiro_lancamentos_detalhe.php. */
export async function detalheLancamentos(lojaId: number, input: DetalheLancamentosInput): Promise<DetalheLancamentosResultado> {
  const hoje = dataFortaleza();
  const mesAtual = Number(hoje.slice(5, 7));
  const anoAtual = Number(hoje.slice(0, 4));

  const mes = Math.max(1, Math.min(12, input.mes ?? mesAtual));
  const ano = input.ano ?? anoAtual;
  const tipo = input.tipo === "income" || input.tipo === "expense" ? input.tipo : "";
  const categoriaId = input.categoriaId ?? 0;
  const contaId = input.contaId ?? 0;
  const perPage = 5;

  await syncMesAtualSeNecessario(lojaId, mes, ano);

  const anos = await opcoesAnos(lojaId, anoAtual, ano);

  const filtros: FiltrosLancamentos = { referenceMonth: mes, referenceYear: ano };
  if (tipo) filtros.type = tipo;
  if (categoriaId > 0) filtros.categoryId = categoriaId;
  if (contaId > 0) filtros.accountId = contaId;

  const todos = await listarLancamentosFiltrados(lojaId, filtros);
  const total = todos.length;
  const totalPaginas = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, input.page ?? 1), totalPaginas);
  const visiveis = todos.slice((page - 1) * perPage, page * perPage);

  const catIds = [...new Set(visiveis.map((v) => v.categoryId))];
  const accIds = [...new Set(visiveis.map((v) => v.accountId))];
  const pmIds = [...new Set(visiveis.map((v) => v.paymentMethodId).filter((v): v is number => v !== null))];

  const catMap = new Map<number, string>();
  if (catIds.length > 0) {
    const linhas = await db.select({ id: financialCategories.id, name: financialCategories.name }).from(financialCategories).where(and(eq(financialCategories.tenant_id, lojaId), inArray(financialCategories.id, catIds)));
    for (const l of linhas) catMap.set(l.id, l.name);
  }
  const accMap = new Map<number, string>();
  if (accIds.length > 0) {
    const linhas = await db.select({ id: financialAccounts.id, name: financialAccounts.name }).from(financialAccounts).where(and(eq(financialAccounts.tenant_id, lojaId), inArray(financialAccounts.id, accIds)));
    for (const l of linhas) accMap.set(l.id, l.name);
  }
  const pmMap = new Map<number, string>();
  if (pmIds.length > 0) {
    const linhas = await db.select({ id: paymentMethods.id, name: paymentMethods.name }).from(paymentMethods).where(and(eq(paymentMethods.tenant_id, lojaId), inArray(paymentMethods.id, pmIds)));
    for (const l of linhas) pmMap.set(l.id, l.name);
  }

  const lancamentos: LancamentoDetalhado[] = visiveis.map((l) => ({
    ...l,
    accountName: accMap.get(l.accountId) ?? null,
    categoryName: catMap.get(l.categoryId) ?? null,
    paymentMethodName: l.paymentMethodId !== null ? (pmMap.get(l.paymentMethodId) ?? null) : null,
  }));

  const [categorias, contas, formasPagamento] = await Promise.all([listarCategoriasFinanceiras(lojaId, undefined, true), listarContasFinanceiras(lojaId, true), listarFormasPagamento(lojaId, true)]);

  return {
    mes,
    ano,
    anos,
    tipo,
    categoriaId,
    contaId,
    page,
    perPage,
    total,
    totalPaginas,
    lancamentos,
    categorias: categorias.map((c) => ({ id: c.id, name: c.name, type: c.type })),
    contas: contas.map((c) => ({ id: c.id, name: c.name })),
    formasPagamento: formasPagamento.map((f) => ({ id: f.id, name: f.name })),
  };
}

export type SincronizarPedidosResultado = { modo: "mes" | "todos"; periodos?: string[]; created: number; updated: number; orders: number; msg: string };

/* Equivalente de admin/api/v1/financeiro_sync_pedidos.php. */
export async function sincronizarPedidosFinanceiro(lojaId: number, modoInput: string, mesInput?: number, anoInput?: number): Promise<SincronizarPedidosResultado> {
  const hoje = dataFortaleza();
  const mesAtual = Number(hoje.slice(5, 7));
  const anoAtual = Number(hoje.slice(0, 4));

  if (modoInput === "todos") {
    const periodosLinhas = await db
      .selectDistinct({ ano: sql<number>`extract(year from ${pedidos.criado_em})::int`, mes: sql<number>`extract(month from ${pedidos.criado_em})::int` })
      .from(pedidos)
      .where(
        and(
          eq(pedidos.loja_id, lojaId),
          eq(pedidos.status, "finalizado"),
          sql`${pedidos.total} > 0`,
          sql`not exists (select 1 from financial_transactions ft where ft.tenant_id = ${pedidos.loja_id} and ft.order_id = ${pedidos.id} and ft.type = 'income')`
        )
      )
      .orderBy(sql`extract(year from ${pedidos.criado_em})::int`, sql`extract(month from ${pedidos.criado_em})::int`);

    let totalCriados = 0;
    let totalAtualizados = 0;
    let totalPedidos = 0;
    const periodos: string[] = [];

    for (const p of periodosLinhas) {
      const resultado = await syncFinalizedOrdersForPeriod(lojaId, p.mes, p.ano);
      totalCriados += resultado.created;
      totalAtualizados += resultado.updated;
      totalPedidos += resultado.orders;
      periodos.push(`${p.mes}/${p.ano}`);
    }

    return {
      modo: "todos",
      periodos,
      created: totalCriados,
      updated: totalAtualizados,
      orders: totalPedidos,
      msg: `Sincronizados ${totalPedidos} pedido(s) — ${totalCriados} lançamento(s) criado(s).`,
    };
  }

  const mes = mesInput ?? mesAtual;
  const ano = anoInput ?? anoAtual;
  const resultado = await syncFinalizedOrdersForPeriod(lojaId, mes, ano);
  return {
    modo: "mes",
    created: resultado.created,
    updated: resultado.updated,
    orders: resultado.orders,
    msg: `Sincronizados ${resultado.orders} pedido(s) de ${mes}/${ano} — ${resultado.created} lançamento(s) criado(s).`,
  };
}
