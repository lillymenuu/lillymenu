import "server-only";
import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { pedidos, pedidoPagamentos, financialCategories, financialAccounts, paymentMethods, financialTransactions } from "@/db/schema";
import { criarLancamento, atualizarLancamento, excluirLancamento } from "@/db/queries/financeiroCore";
import { codigoDisplay, pedidoCodigoBase } from "@/db/queries/pedidosAdmin";

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
