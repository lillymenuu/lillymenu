import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import {
  pedidos,
  pedidoItens,
  pedidoPagamentos,
  pedidoStatusLog,
  clientes,
  produtos,
  combos,
  estoque,
  estoqueMovimentacoes,
  cupons,
  cashbackMovimentacoes,
  pontosMovimentacoes,
  fiadoLancamentos,
  caixaTurnos,
  taxasDinamicas,
  operacaoLogs,
} from "@/db/schema";
import { getConfig } from "@/db/queries/config";
import { timestampFortaleza, dataFortaleza, adicionarDiasFortaleza } from "@/db/queries/tempo";
import { sincronizarEstoqueVinculo, registrarComponentesCombo } from "@/db/queries/estoqueVinculo";
import { pedidoRestaurarEstoqueCancelado } from "@/db/queries/pedidoEstoque";
import { syncOrderRevenue, reverseCanceledOrder } from "@/db/queries/financeiroSync";

/*
 * Equivalente de admin/api/pdv_salvar.php: cria (ou edita) um pedido de
 * balcao. O modulo mais complexo do PDV — cobre estoque (com combos),
 * multiplas formas de pagamento (inclusive fiado e "resgate" de pontos),
 * cupom, desconto manual (admin/gerente), taxa de entrega (fixa/bairro/
 * dinamica), cashback (uso com FIFO por entrada + credito pendente),
 * pontos (resgate imediato + credito pendente), exigencia de caixa aberto,
 * edicao de pedido existente (so pagamento vs. itens diferentes) e
 * deduplicacao por offline_uuid (sync de pedido feito offline no PDV).
 *
 * Fora do escopo (como no PHP): notificacao por WhatsApp.
 */

function toFloat(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function extrairBairroEndereco(endereco: string | null | undefined): string {
  if (!endereco) return "";
  const m = endereco.match(/Bairro:\s*([^|]+)/i);
  return m ? m[1].trim() : "";
}

function calcularTaxaDinamica(distancia: number, regras: { distancia_km: number; valor: number }[]): number {
  if (regras.length === 0 || distancia <= 0) return 0;
  const ordenadas = [...regras].sort((a, b) => a.distancia_km - b.distancia_km);
  const regra = ordenadas.find((r) => distancia <= r.distancia_km) ?? ordenadas[ordenadas.length - 1];
  const valor = regra?.valor ?? 0;
  return valor < 0 ? 0 : valor;
}

async function registrarOperacao(operadorId: number | null, acao: string, referencia: string, dados?: Record<string, unknown>): Promise<void> {
  try {
    await db.insert(operacaoLogs).values({ operador_id: operadorId, acao, referencia, dados: dados ? JSON.stringify(dados) : null });
  } catch {
    // silencia — log nao pode interromper o fluxo principal
  }
}

export type ItemCarrinhoPdv = {
  id?: number;
  nome: string;
  preco: number;
  qtd: number;
  observacoes?: string;
  combosels?: { id: number; qtd?: number }[] | null;
  usarPontos?: boolean;
};

export type PagamentoPdvInput = { forma: string; valor?: number };

export type SalvarPedidoPdvInput = {
  lojaId: number;
  adminId: number;
  perfil: string;
  clienteId: number;
  tipo: "retirada" | "entrega";
  endereco?: string;
  distanciaKm?: number;
  agendamento?: string;
  itens: ItemCarrinhoPdv[];
  taxaEntregaPost?: number;
  taxaEditada?: boolean;
  formaPagamentoPrincipal?: string;
  valorPago?: number;
  cupomCodigo?: string;
  descontoTipo?: "valor" | "percent";
  descontoValor?: number;
  taxaMaquininhaPercent?: number;
  cashbackAplicado?: boolean;
  cashbackUsado?: number;
  pagamentos?: PagamentoPdvInput[];
  pagamentoDividido?: boolean;
  caixaIdPost?: number;
  offlineUuid?: string;
  pedidoEdicaoId?: number;
  observacoesCliente?: string;
};

export type SalvarPedidoPdvResultado = { ok: true; pedidoId: number; tipo: string; jaExistia?: boolean } | { ok: false; msg: string };

async function calcularTaxaEntrega(lojaId: number, tipo: string, endereco: string | undefined, distanciaKm: number): Promise<number> {
  if (tipo !== "entrega") return 0;

  const taxaPadrao = toFloat(await getConfig(lojaId, "taxa_entrega", "0"));
  const taxaTipo = await getConfig(lojaId, "taxa_entrega_tipo", "dinamica");

  if (taxaTipo === "fixa") return taxaPadrao;

  if (taxaTipo === "bairro") {
    const bairro = extrairBairroEndereco(endereco);
    if (!bairro) return 0;
    const raw = await getConfig(lojaId, "taxas_bairro", "");
    if (!raw) return 0;
    try {
      const mapa = JSON.parse(raw) as Record<string, number>;
      for (const [nome, valor] of Object.entries(mapa)) {
        if (nome.toLowerCase() === bairro.toLowerCase()) return Number(valor);
      }
    } catch {
      // ignora JSON invalido
    }
    return 0;
  }

  if (taxaTipo === "dinamica" || taxaTipo === "area") {
    const regras = await db.select({ distancia_km: taxasDinamicas.distancia_km, valor: taxasDinamicas.valor }).from(taxasDinamicas).where(eq(taxasDinamicas.loja_id, lojaId)).orderBy(taxasDinamicas.distancia_km);
    return calcularTaxaDinamica(distanciaKm, regras);
  }

  if (taxaTipo === "sem") return 0;

  return taxaPadrao;
}

type CupomValidado = { id: number; frete: boolean; descontoTipo: "valor" | "percent"; descontoValor: number };

/** Validacao de cupom inline do PDV — mais simples que cupons.ts::validarCupom (cliente ja e conhecido, sem checagem de "publico"). */
async function validarCupomPdv(lojaId: number, codigo: string, clienteId: number, subtotal: number): Promise<CupomValidado | { erro: string }> {
  const [cupom] = await db.select().from(cupons).where(and(eq(cupons.codigo, codigo), eq(cupons.loja_id, lojaId))).limit(1);
  if (!cupom) return { erro: "Cupom nao encontrado" };
  if (!cupom.ativo) return { erro: "Cupom indisponivel" };
  if (cupom.quantidade_total > 0 && cupom.quantidade_usada >= cupom.quantidade_total) return { erro: "Cupom esgotado" };
  if (cupom.minimo > 0 && subtotal < cupom.minimo) return { erro: "Pedido abaixo do minimo do cupom" };

  if (cupom.primeira_compra) {
    const [{ n }] = await db.select({ n: sql<string>`count(*)` }).from(pedidos).where(and(eq(pedidos.cliente_id, clienteId), eq(pedidos.loja_id, lojaId)));
    if (Number(n) > 0) return { erro: "Cupom valido apenas para primeira compra" };
  }

  const frete = cupom.tipo === "frete";
  return { id: cupom.id, frete, descontoTipo: frete ? "valor" : cupom.tipo === "valor" ? "valor" : "percent", descontoValor: frete ? 0 : cupom.desconto };
}

export async function salvarPedidoPdv(input: SalvarPedidoPdvInput): Promise<SalvarPedidoPdvResultado> {
  const { lojaId, adminId } = input;
  const perfil = input.perfil;
  const itens = input.itens ?? [];

  let cupom = (input.cupomCodigo ?? "").trim().toUpperCase();
  let descontoTipo: "valor" | "percent" = input.descontoTipo === "percent" ? "percent" : "valor";
  let descontoValor = toFloat(input.descontoValor);
  let taxaMaquininhaPercent = toFloat(input.taxaMaquininhaPercent);
  if (perfil !== "admin" && perfil !== "gerente") {
    cupom = "";
    descontoValor = 0;
    taxaMaquininhaPercent = 0;
  }

  if (!input.clienteId || itens.length === 0) return { ok: false, msg: "Dados incompletos" };

  const offlineUuid = input.offlineUuid && /^[0-9a-fA-F-]{32,36}$/.test(input.offlineUuid) ? input.offlineUuid : "";
  if (offlineUuid) {
    const [existente] = await db.select({ id: pedidos.id }).from(pedidos).where(and(eq(pedidos.offline_uuid, offlineUuid), eq(pedidos.loja_id, lojaId))).limit(1);
    if (existente) return { ok: true, pedidoId: existente.id, tipo: input.tipo, jaExistia: true };
  }

  const pedidoEdicaoId = input.pedidoEdicaoId && input.pedidoEdicaoId > 0 ? input.pedidoEdicaoId : null;

  // valida produtos/combos existem na loja
  const produtoIdsCheck = new Set<number>();
  const comboIdsCheck = new Set<number>();
  for (const i of itens) {
    const pid = i.id ?? 0;
    const isCombo = Boolean(i.combosels && i.combosels.length > 0);
    if (pid > 0) {
      if (isCombo) comboIdsCheck.add(pid);
      else produtoIdsCheck.add(pid);
    }
    if (isCombo) for (const sel of i.combosels ?? []) if (sel.id > 0) produtoIdsCheck.add(sel.id);
  }
  if (produtoIdsCheck.size > 0) {
    const [{ n }] = await db.select({ n: sql<string>`count(*)` }).from(produtos).where(and(inArray(produtos.id, [...produtoIdsCheck]), eq(produtos.loja_id, lojaId)));
    if (Number(n) !== produtoIdsCheck.size) return { ok: false, msg: "Existem produtos invalidos para esta loja." };
  }
  if (comboIdsCheck.size > 0) {
    const [{ n }] = await db.select({ n: sql<string>`count(*)` }).from(combos).where(and(inArray(combos.id, [...comboIdsCheck]), eq(combos.loja_id, lojaId)));
    if (Number(n) !== comboIdsCheck.size) return { ok: false, msg: "Existem combos invalidos para esta loja." };
  }

  // estoque: so bloqueia pedido NOVO (editar nao consome estoque adicional aqui)
  if (!pedidoEdicaoId) {
    const necessario = new Map<number, number>();
    for (const i of itens) {
      const qtdItem = Math.max(1, i.qtd || 1);
      if (i.combosels && i.combosels.length > 0) {
        for (const sel of i.combosels) {
          const selQtd = (sel.qtd ?? 1) * qtdItem;
          if (sel.id > 0 && selQtd > 0) necessario.set(sel.id, (necessario.get(sel.id) ?? 0) + selQtd);
        }
      } else if ((i.id ?? 0) > 0) {
        necessario.set(i.id as number, (necessario.get(i.id as number) ?? 0) + qtdItem);
      }
    }
    if (necessario.size > 0) {
      const linhas = await db
        .select({ id: produtos.id, nome: produtos.nome, estoqueQtd: estoque.quantidade })
        .from(produtos)
        .leftJoin(estoque, and(eq(estoque.produto_id, produtos.id), eq(estoque.loja_id, produtos.loja_id)))
        .where(and(inArray(produtos.id, [...necessario.keys()]), eq(produtos.loja_id, lojaId)));
      for (const row of linhas) {
        const nec = necessario.get(row.id) ?? 0;
        if (nec > 0 && (row.estoqueQtd ?? 0) < nec) return { ok: false, msg: `"${row.nome}" está sem estoque suficiente no momento.` };
      }
    }
  }

  const [clienteExiste] = await db.select({ id: clientes.id }).from(clientes).where(and(eq(clientes.id, input.clienteId), eq(clientes.loja_id, lojaId))).limit(1);
  if (!clienteExiste) return { ok: false, msg: "Selecione um cliente valido para esta loja." };

  if (input.tipo === "entrega" && !input.endereco) return { ok: false, msg: "Endereco obrigatorio" };

  // caixa aberto (do operador hoje, ou qualquer caixa aberto hoje da loja)
  const hojeCaixa = dataFortaleza();
  let caixaId: number | null = null;
  if (adminId) {
    if (input.caixaIdPost) {
      const [c] = await db
        .select({ id: caixaTurnos.id })
        .from(caixaTurnos)
        .where(and(eq(caixaTurnos.id, input.caixaIdPost), eq(caixaTurnos.operador_id, adminId), eq(caixaTurnos.status, "aberto"), eq(caixaTurnos.loja_id, lojaId), sql`to_char(${caixaTurnos.aberto_em}, 'YYYY-MM-DD') = ${hojeCaixa}`))
        .limit(1);
      caixaId = c?.id ?? null;
    }
    if (!caixaId) {
      const [c] = await db
        .select({ id: caixaTurnos.id })
        .from(caixaTurnos)
        .where(and(eq(caixaTurnos.operador_id, adminId), eq(caixaTurnos.status, "aberto"), eq(caixaTurnos.loja_id, lojaId), sql`to_char(${caixaTurnos.aberto_em}, 'YYYY-MM-DD') = ${hojeCaixa}`))
        .orderBy(sql`${caixaTurnos.id} desc`)
        .limit(1);
      caixaId = c?.id ?? null;
    }
  }
  if (!caixaId) {
    const [anterior] = await db
      .select({ abertoEm: caixaTurnos.aberto_em })
      .from(caixaTurnos)
      .where(and(eq(caixaTurnos.operador_id, adminId), eq(caixaTurnos.status, "aberto"), eq(caixaTurnos.loja_id, lojaId)))
      .orderBy(sql`${caixaTurnos.id} desc`)
      .limit(1);
    if (anterior) {
      const [ano, mes, dia] = anterior.abertoEm.slice(0, 10).split("-");
      return { ok: false, msg: `Feche o caixa do dia ${dia}/${mes}/${ano} e abra o caixa de hoje para criar pedidos.` };
    }
    return { ok: false, msg: "Caixa fechado. Abra o caixa do dia para criar pedidos." };
  }

  let subtotal = 0;
  for (const i of itens) subtotal += toFloat(i.preco) * (i.qtd || 0);

  let cupomAplicado = false;
  let cupomId: number | null = null;
  let cupomFrete = false;
  if (cupom !== "") {
    const resultado = await validarCupomPdv(lojaId, cupom, input.clienteId, subtotal);
    if ("erro" in resultado) return { ok: false, msg: resultado.erro };
    cupomFrete = resultado.frete;
    descontoTipo = resultado.descontoTipo;
    descontoValor = resultado.descontoValor;
    cupomAplicado = true;
    cupomId = resultado.id;
  }

  let taxa = await calcularTaxaEntrega(lojaId, input.tipo, input.endereco, input.distanciaKm ?? 0);
  if (input.tipo === "entrega" && input.taxaEditada && input.taxaEntregaPost !== undefined) taxa = toFloat(input.taxaEntregaPost);
  if (cupomFrete) {
    if (input.tipo !== "entrega") return { ok: false, msg: "Cupom valido apenas para entrega" };
    taxa = 0;
  }
  const taxaGratisAtivo = (await getConfig(lojaId, "taxa_entrega_gratis", "0")) === "1";
  const pedidoMinimo = toFloat(await getConfig(lojaId, "pedido_minimo", "0"));
  if (taxaGratisAtivo && pedidoMinimo > 0 && subtotal >= pedidoMinimo) taxa = 0;

  const desconto = descontoValor > 0 ? (descontoTipo === "percent" ? subtotal * (descontoValor / 100) : descontoValor) : 0;

  const [cliente] = await db.select({ cashbackSaldo: clientes.cashback_saldo }).from(clientes).where(and(eq(clientes.id, input.clienteId), eq(clientes.loja_id, lojaId))).limit(1);
  const clienteCashbackSaldo = cliente?.cashbackSaldo ?? 0;

  const naoLiberadasLinhas = await db.execute<{ valor: string; usado: string }>(sql`
    SELECT m.valor,
      COALESCE((SELECT SUM(valor) FROM cashback_movimentacoes u WHERE u.referencia_id = m.id AND u.tipo IN ('uso','resgate','expirado') AND u.loja_id = m.loja_id), 0) AS usado
    FROM cashback_movimentacoes m
    WHERE m.cliente_id = ${input.clienteId} AND m.loja_id = ${lojaId} AND m.tipo IN ('entrada','ganho')
      AND m.disponivel_em IS NOT NULL AND m.disponivel_em > NOW() AND (m.expira_em IS NULL OR m.expira_em >= CURRENT_DATE)
  `);
  let cashbackNaoLiberado = 0;
  for (const row of naoLiberadasLinhas.rows) {
    const d = Number(row.valor) - Number(row.usado);
    if (d > 0) cashbackNaoLiberado += d;
  }
  const clienteCashbackLiberado = Math.max(0, Math.min(clienteCashbackSaldo, clienteCashbackSaldo - cashbackNaoLiberado));

  const cashbackUsadoInput = Math.max(0, toFloat(input.cashbackUsado));
  if (cashbackUsadoInput > 0) {
    if (cashbackUsadoInput > clienteCashbackLiberado + 0.009) {
      const msg = cashbackUsadoInput <= clienteCashbackSaldo + 0.009 ? "Cashback ainda em carência. Aguarde o período de liberação após a compra que o gerou." : "Cashback insuficiente para o cliente.";
      return { ok: false, msg };
    }
    const limiteUso = Math.max(0, subtotal + taxa - desconto);
    if (cashbackUsadoInput > limiteUso) return { ok: false, msg: "Cashback acima do valor do pedido." };
  }

  const base = Math.max(0, subtotal + taxa - desconto - cashbackUsadoInput);

  // multiplas formas de pagamento
  const pagamentosRaw = input.pagamentos ?? [];
  let pagamentosValidos: { forma: string; valor: number }[] = [];
  if (pagamentosRaw.length === 0) {
    pagamentosValidos = [{ forma: input.formaPagamentoPrincipal ?? "pix", valor: base }];
  } else {
    for (const p of pagamentosRaw) {
      if (!p.forma) continue;
      if (p.forma === "resgate") {
        pagamentosValidos.push({ forma: p.forma, valor: 0 });
        continue;
      }
      if (p.forma === "fiado" && pagamentosRaw.length === 1) {
        pagamentosValidos.push({ forma: p.forma, valor: base });
        continue;
      }
      const valor = toFloat(p.valor);
      if (valor <= 0) continue;
      pagamentosValidos.push({ forma: p.forma, valor });
    }
  }
  if (pagamentosValidos.length === 0) return { ok: false, msg: "Pagamento invalido" };

  // pontos (clube de fidelidade)
  const clubePontosAtivo = (await getConfig(lojaId, "clube_pontos_ativo", "0")) === "1";
  let pontosGanhoTotal = 0;
  let pontosCustoTotal = 0;
  if (clubePontosAtivo) {
    const idsProdutos = [...new Set(itens.map((i) => i.id).filter((id): id is number => Boolean(id && id > 0)))];
    if (idsProdutos.length > 0) {
      const linhas = await db.select({ id: produtos.id, pontosGanho: produtos.pontos_ganho, pontosCusto: produtos.pontos_custo }).from(produtos).where(and(inArray(produtos.id, idsProdutos), eq(produtos.loja_id, lojaId)));
      const mapa = new Map(linhas.map((l) => [l.id, l]));
      for (const i of itens) {
        const pid = i.id ?? 0;
        const qtd = i.qtd ?? 0;
        if (pid <= 0 || qtd <= 0) continue;
        const dados = mapa.get(pid);
        if (!dados) continue;
        if (i.usarPontos) pontosCustoTotal += dados.pontosCusto * qtd;
        else pontosGanhoTotal += dados.pontosGanho * qtd;
      }
    }
    if (pontosCustoTotal > 0) {
      const [c] = await db.select({ saldo: clientes.pontos_saldo }).from(clientes).where(and(eq(clientes.id, input.clienteId), eq(clientes.loja_id, lojaId))).limit(1);
      if ((c?.saldo ?? 0) < pontosCustoTotal) return { ok: false, msg: "Pontos insuficientes para resgatar os itens." };
    }
  }

  // agendamento
  let agendamentoValor: string | null = null;
  if (input.agendamento) {
    const raw = input.agendamento.replace("T", " ");
    const d = new Date(raw.includes(":") && raw.length <= 16 ? `${raw}:00` : raw);
    if (!Number.isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      agendamentoValor = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  }

  // totais + pagamento
  let taxaMaquininhaTotal = 0;
  let pagamentoTotal = 0;
  let dinheiroPago = 0;
  let dinheiroRecebido = toFloat(input.valorPago) > 0 ? toFloat(input.valorPago) : 0;

  for (const p of pagamentosValidos) {
    pagamentoTotal += p.valor;
    if (p.forma === "dinheiro") dinheiroPago += p.valor;
  }
  const pagamentoPrincipal = pagamentosValidos[0]?.forma ?? input.formaPagamentoPrincipal ?? "pix";

  if (input.pagamentoDividido) {
    for (const p of pagamentosValidos) if (p.forma === "credito" || p.forma === "debito") taxaMaquininhaTotal += p.valor * (taxaMaquininhaPercent / 100);
  } else if (pagamentoPrincipal === "credito" || pagamentoPrincipal === "debito") {
    taxaMaquininhaTotal = base * (taxaMaquininhaPercent / 100);
  }

  const total = base + taxaMaquininhaTotal;
  if (Math.abs(pagamentoTotal - total) > 0.01) return { ok: false, msg: "A soma dos pagamentos precisa ser igual ao total" };

  const cashbackConfigAtivo = (await getConfig(lojaId, "cashback_ativo", "0")) === "1";
  const cashbackPercentual = toFloat(await getConfig(lojaId, "cashback_percentual", "0"));
  const cashbackExpiraDias = Number(await getConfig(lojaId, "cashback_expira_dias", "0"));
  let cashbackValor = 0;
  let cashbackExpiraEm: string | null = null;
  const cashbackAplicadoFinal = Boolean(input.cashbackAplicado) && cashbackConfigAtivo && cashbackPercentual > 0;
  if (cashbackAplicadoFinal) {
    const cashbackBase = Math.max(0, subtotal - desconto);
    cashbackValor = Math.max(0, Math.round(cashbackBase * (cashbackPercentual / 100) * 100) / 100);
    if (cashbackExpiraDias > 0) cashbackExpiraEm = adicionarDiasFortaleza(cashbackExpiraDias);
  }

  let troco: number | null = null;
  if (dinheiroPago > 0) {
    if (dinheiroRecebido <= 0) dinheiroRecebido = dinheiroPago;
    if (dinheiroRecebido + 0.0001 < dinheiroPago) return { ok: false, msg: "Valor em dinheiro insuficiente" };
    troco = dinheiroRecebido - dinheiroPago;
  } else {
    dinheiroRecebido = 0;
    troco = null;
  }

  let fiadoValorTotal = 0;
  for (const p of pagamentosValidos) if (p.forma === "fiado") fiadoValorTotal += p.valor;

  try {
    const resultadoTx = await withTransaction(async (tx) => {
      // edicao com os MESMOS itens: so atualiza pagamento/tipo/endereco/cupom, sem tocar estoque/cashback/pontos/fiado
      if (pedidoEdicaoId) {
        const itensAtuais = await tx.select({ produtoId: pedidoItens.produto_id, quantidade: pedidoItens.quantidade }).from(pedidoItens).where(and(eq(pedidoItens.pedido_id, pedidoEdicaoId), eq(pedidoItens.loja_id, lojaId)));
        const assinaturaAntiga = itensAtuais
          .filter((it) => it.produtoId && it.quantidade)
          .map((it) => `${it.produtoId}:${it.quantidade}`)
          .sort();
        const assinaturaNova = itens
          .filter((i) => (i.id ?? 0) > 0 && (i.qtd ?? 0) > 0)
          .map((i) => `${i.id}:${i.qtd}`)
          .sort();
        const itensIguais = assinaturaAntiga.length > 0 && JSON.stringify(assinaturaAntiga) === JSON.stringify(assinaturaNova);

        if (itensIguais) {
          await tx
            .update(pedidos)
            .set({
              tipo: input.tipo,
              endereco_entrega: input.tipo === "entrega" ? (input.endereco ?? null) : null,
              subtotal,
              taxa_entrega: taxa,
              desconto,
              taxa_maquininha: taxaMaquininhaTotal,
              total,
              forma_pagamento: pagamentoPrincipal,
              valor_pago: dinheiroRecebido > 0 ? dinheiroRecebido : null,
              troco,
              cupom: cupom !== "" ? cupom : null,
              updated_at: sql`now()`,
            })
            .where(and(eq(pedidos.id, pedidoEdicaoId), eq(pedidos.loja_id, lojaId)));

          await tx.delete(pedidoPagamentos).where(and(eq(pedidoPagamentos.pedido_id, pedidoEdicaoId), eq(pedidoPagamentos.loja_id, lojaId)));
          for (const p of pagamentosValidos) {
            const taxaPagamento = p.forma === "credito" || p.forma === "debito" ? p.valor * (taxaMaquininhaPercent / 100) : 0;
            await tx.insert(pedidoPagamentos).values({ pedido_id: pedidoEdicaoId, forma: p.forma, valor: p.valor, taxa_maquininha: taxaPagamento, loja_id: lojaId });
          }

          return { apenasPagamento: true as const, pedidoId: pedidoEdicaoId };
        }
      }

      const camposPedido: Record<string, unknown> = {
        cliente_id: input.clienteId,
        operador_id: adminId,
        caixa_id: caixaId,
        tipo: input.tipo,
        endereco_entrega: input.tipo === "entrega" ? (input.endereco ?? null) : null,
        subtotal,
        taxa_entrega: taxa,
        desconto,
        taxa_maquininha: taxaMaquininhaTotal,
        total,
        forma_pagamento: pagamentoPrincipal,
        valor_pago: dinheiroRecebido > 0 ? dinheiroRecebido : null,
        troco,
        cupom: cupom !== "" ? cupom : null,
        status: "aceito",
        loja_id: lojaId,
        observacoes_cliente: input.observacoesCliente?.trim() || null,
        agendamento: agendamentoValor,
        cashback_valor: cashbackAplicadoFinal ? cashbackValor : 0,
        cashback_usado: cashbackUsadoInput > 0 ? cashbackUsadoInput : 0,
        cashback_percentual: cashbackAplicadoFinal ? cashbackPercentual : 0,
        cashback_expira_em: cashbackAplicadoFinal ? cashbackExpiraEm : null,
        cashback_aplicado: cashbackAplicadoFinal,
        origem: "balcao",
        offline_uuid: offlineUuid !== "" ? offlineUuid : null,
        criado_em: timestampFortaleza(),
      };

      const [novoPedido] = await tx.insert(pedidos).values(camposPedido as typeof pedidos.$inferInsert).returning({ id: pedidos.id });
      const pedidoId = novoPedido.id;

      for (const i of itens) {
        const nomeItem = (i.nome ?? "").trim();
        const qtdItem = i.qtd ?? 0;
        const precoItem = toFloat(i.preco);
        if (nomeItem === "" || qtdItem <= 0) continue;
        const produtoIdItem = i.id ?? 0;
        const isCombo = Boolean(i.combosels && i.combosels.length > 0);

        const [novoItem] = await tx
          .insert(pedidoItens)
          .values({ pedido_id: pedidoId, produto_nome: nomeItem, quantidade: qtdItem, preco: precoItem, observacoes: i.observacoes ?? null, loja_id: lojaId, produto_id: produtoIdItem > 0 ? produtoIdItem : null })
          .returning({ id: pedidoItens.id });

        if (produtoIdItem > 0 && !isCombo) {
          await tx.insert(estoque).values({ produto_id: produtoIdItem, quantidade: 0, loja_id: lojaId }).onConflictDoNothing({ target: estoque.produto_id });
          await tx.update(estoque).set({ quantidade: sql`${estoque.quantidade} - ${qtdItem}` }).where(and(eq(estoque.produto_id, produtoIdItem), eq(estoque.loja_id, lojaId)));
          await tx.insert(estoqueMovimentacoes).values({ produto_id: produtoIdItem, tipo: "saida", quantidade: qtdItem, origem: "pedido", referencia_id: pedidoId, loja_id: lojaId });
          await sincronizarEstoqueVinculo(tx, produtoIdItem, lojaId, { tipo: "saida", quantidade: qtdItem, origem: "pedido", referenciaId: pedidoId });
        }

        if (i.combosels && i.combosels.length > 0) {
          for (const sel of i.combosels) {
            const selQtd = (sel.qtd ?? 1) * qtdItem;
            if (sel.id <= 0 || selQtd <= 0) continue;
            await tx.insert(estoque).values({ produto_id: sel.id, quantidade: 0, loja_id: lojaId }).onConflictDoNothing({ target: estoque.produto_id });
            await tx.update(estoque).set({ quantidade: sql`${estoque.quantidade} - ${selQtd}` }).where(and(eq(estoque.produto_id, sel.id), eq(estoque.loja_id, lojaId)));
            await tx.insert(estoqueMovimentacoes).values({ produto_id: sel.id, tipo: "saida", quantidade: selQtd, origem: "pedido", referencia_id: pedidoId, loja_id: lojaId });
            await sincronizarEstoqueVinculo(tx, sel.id, lojaId, { tipo: "saida", quantidade: selQtd, origem: "pedido", referenciaId: pedidoId });
          }
          await registrarComponentesCombo(tx, pedidoId, novoItem.id, i.combosels, qtdItem, lojaId);
        }
      }

      for (const p of pagamentosValidos) {
        const taxaPagamento = p.forma === "credito" || p.forma === "debito" ? p.valor * (taxaMaquininhaPercent / 100) : 0;
        await tx.insert(pedidoPagamentos).values({ pedido_id: pedidoId, forma: p.forma, valor: p.valor, taxa_maquininha: taxaPagamento, loja_id: lojaId });
      }

      await tx.insert(pedidoStatusLog).values({ pedido_id: pedidoId, status: "aceito", loja_id: lojaId });

      if (cupomAplicado && cupomId) {
        const resCupom = await tx
          .update(cupons)
          .set({ quantidade_usada: sql`${cupons.quantidade_usada} + 1`, atualizado_em: sql`now()` })
          .where(and(eq(cupons.id, cupomId), eq(cupons.loja_id, lojaId), sql`(${cupons.quantidade_total} = 0 or ${cupons.quantidade_usada} < ${cupons.quantidade_total})`));
        if ((resCupom.rowCount ?? 0) === 0) throw new Error("Cupom indisponivel");
      }

      // cashback: uso (FIFO por entrada/ganho) + credito pendente
      if (cashbackUsadoInput > 0.009 || (cashbackAplicadoFinal && cashbackValor > 0.009)) {
        const saldoAntes = clienteCashbackSaldo;
        let saldoDepois = saldoAntes;
        if (cashbackUsadoInput > 0) saldoDepois = Math.max(0, saldoDepois - cashbackUsadoInput);
        const deltaCashback = saldoDepois - saldoAntes;
        if (Math.abs(deltaCashback) > 0.009) {
          await tx.update(clientes).set({ cashback_saldo: sql`greatest(0, ${clientes.cashback_saldo} + ${deltaCashback})` }).where(and(eq(clientes.id, input.clienteId), eq(clientes.loja_id, lojaId)));
        }

        let saldoMov = saldoAntes;
        if (cashbackUsadoInput > 0.009) {
          let restante = cashbackUsadoInput;
          const entradasResult = await tx.execute<{ id: number; valor: string; usado: string }>(sql`
            SELECT m.id, m.valor,
              COALESCE((SELECT SUM(valor) FROM cashback_movimentacoes u WHERE u.referencia_id = m.id AND u.tipo IN ('uso','resgate','expirado') AND u.loja_id = m.loja_id), 0) AS usado
            FROM cashback_movimentacoes m
            WHERE m.cliente_id = ${input.clienteId} AND m.loja_id = ${lojaId} AND m.tipo IN ('entrada','ganho')
              AND (m.expira_em IS NULL OR m.expira_em >= CURRENT_DATE) AND (m.disponivel_em IS NULL OR m.disponivel_em <= NOW())
            ORDER BY m.criado_em ASC, m.id ASC
          `);
          for (const entrada of entradasResult.rows) {
            if (restante <= 0.009) break;
            const disponivel = Number(entrada.valor) - Number(entrada.usado);
            if (disponivel <= 0.009) continue;
            const usar = Math.min(restante, disponivel);
            const saldoDepoisMov = Math.max(0, saldoMov - usar);
            await tx.insert(cashbackMovimentacoes).values({ cliente_id: input.clienteId, pedido_id: pedidoId, tipo: "uso", valor: usar, saldo_antes: saldoMov, saldo_depois: saldoDepoisMov, referencia_id: entrada.id, loja_id: lojaId });
            saldoMov = saldoDepoisMov;
            restante -= usar;
          }
          if (restante > 0.009) {
            const saldoDepoisMov = Math.max(0, saldoMov - restante);
            await tx.insert(cashbackMovimentacoes).values({ cliente_id: input.clienteId, pedido_id: pedidoId, tipo: "uso", valor: restante, saldo_antes: saldoMov, saldo_depois: saldoDepoisMov, referencia_id: null, loja_id: lojaId });
            saldoMov = saldoDepoisMov;
          }
        }

        if (cashbackAplicadoFinal && cashbackValor > 0.009) {
          await tx.insert(cashbackMovimentacoes).values({ cliente_id: input.clienteId, pedido_id: pedidoId, tipo: "pendente", valor: cashbackValor, saldo_antes: saldoMov, saldo_depois: saldoMov, referencia_id: null, loja_id: lojaId });
        }
      }

      // pontos: resgate imediato + credito pendente
      if (clubePontosAtivo && (pontosGanhoTotal > 0 || pontosCustoTotal > 0)) {
        const [c] = await tx.select({ saldo: clientes.pontos_saldo }).from(clientes).where(and(eq(clientes.id, input.clienteId), eq(clientes.loja_id, lojaId))).limit(1);
        let saldoMovPontos = c?.saldo ?? 0;
        let deltaPontos = 0;
        if (pontosCustoTotal > 0) {
          const saldoDepois = Math.max(0, saldoMovPontos - pontosCustoTotal);
          await tx.insert(pontosMovimentacoes).values({ cliente_id: input.clienteId, pedido_id: pedidoId, tipo: "resgate", pontos: pontosCustoTotal, saldo_antes: saldoMovPontos, saldo_depois: saldoDepois, referencia_id: null, loja_id: lojaId });
          saldoMovPontos = saldoDepois;
          deltaPontos -= pontosCustoTotal;
        }
        if (deltaPontos !== 0) {
          await tx.update(clientes).set({ pontos_saldo: sql`greatest(0, ${clientes.pontos_saldo} + ${deltaPontos})` }).where(and(eq(clientes.id, input.clienteId), eq(clientes.loja_id, lojaId)));
        }
        if (pontosGanhoTotal > 0) {
          await tx.insert(pontosMovimentacoes).values({ cliente_id: input.clienteId, pedido_id: pedidoId, tipo: "pendente", pontos: pontosGanhoTotal, saldo_antes: saldoMovPontos, saldo_depois: saldoMovPontos, referencia_id: null, loja_id: lojaId });
        }
      }

      // fiado
      if (fiadoValorTotal > 0.009) {
        const [c] = await tx.select({ saldoFiado: clientes.saldo_fiado }).from(clientes).where(and(eq(clientes.id, input.clienteId), eq(clientes.loja_id, lojaId))).limit(1);
        const saldoAntesFiado = c?.saldoFiado ?? 0;
        const saldoDepoisFiado = saldoAntesFiado + fiadoValorTotal;
        await tx.update(clientes).set({ saldo_fiado: saldoDepoisFiado }).where(and(eq(clientes.id, input.clienteId), eq(clientes.loja_id, lojaId)));
        await tx.insert(fiadoLancamentos).values({ loja_id: lojaId, cliente_id: input.clienteId, pedido_id: pedidoId, operador_id: adminId, tipo: "venda", valor: fiadoValorTotal, saldo_antes: saldoAntesFiado, saldo_depois: saldoDepoisFiado });
      }

      // edicao com itens DIFERENTES: cancela o pedido antigo (repoe estoque) e cria este como novo
      if (pedidoEdicaoId) {
        await pedidoRestaurarEstoqueCancelado(tx, pedidoEdicaoId, lojaId);
        await tx.update(pedidos).set({ status: "cancelado" }).where(and(eq(pedidos.id, pedidoEdicaoId), eq(pedidos.loja_id, lojaId)));
        await tx.insert(pedidoStatusLog).values({ pedido_id: pedidoEdicaoId, status: "cancelado", loja_id: lojaId });
      }

      return { apenasPagamento: false as const, pedidoId, pedidoEdicaoId };
    });

    if (resultadoTx.apenasPagamento) {
      try {
        await syncOrderRevenue(lojaId, resultadoTx.pedidoId);
      } catch (e) {
        console.error("Erro ao sincronizar pedido editado no financeiro:", e);
      }
      await registrarOperacao(adminId, "pedido_editado", `pedido:${resultadoTx.pedidoId}`, { apenas_pagamento: true });
      return { ok: true, pedidoId: resultadoTx.pedidoId, tipo: input.tipo };
    }

    if (resultadoTx.pedidoEdicaoId) {
      try {
        await reverseCanceledOrder(lojaId, resultadoTx.pedidoEdicaoId);
      } catch (e) {
        console.error("Erro ao sincronizar pedido salvo no financeiro:", e);
      }
    }

    await registrarOperacao(adminId, "pedido_criado", `pedido:${resultadoTx.pedidoId}`, { total, tipo: input.tipo });
    if (resultadoTx.pedidoEdicaoId) {
      await registrarOperacao(adminId, "pedido_editado", `pedido:${resultadoTx.pedidoEdicaoId}`, { novo_pedido: resultadoTx.pedidoId });
    }

    return { ok: true, pedidoId: resultadoTx.pedidoId, tipo: input.tipo };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : "Erro interno ao salvar o pedido." };
  }
}
