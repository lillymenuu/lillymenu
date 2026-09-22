import "server-only";
import { and, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { pedidos, pedidoPagamentos, caixaTurnos, caixaMovimentacoes, admins, fiadoLancamentos, clientes } from "@/db/schema";
import { dataFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/caixa_resumo.php: resumo/reconciliacao do
 * turno de caixa aberto no momento. O PHP so tem UI para o "caminho
 * default" (hoje, todos operadores, sem turno especifico selecionado) —
 * essa e a unica variante realmente alcancavel, e a unica portada aqui.
 * Ver um turno especifico do historico continua fora de escopo (endpoint
 * separado, caixa_detalhe.php, nao portado ainda).
 *
 * Diferenca do PHP: sem os testes SHOW COLUMNS/SHOW TABLES de
 * compatibilidade com instalacoes antigas — o schema migrado ja tem
 * todas as colunas/tabelas (caixa_id, status, codigo, fiado_lancamentos).
 */

/** COALESCE(caixa_turnos.aberto_em, pedidos.criado_em) — mesma "competencia" usada no dashboard, mas aqui como datetime completo (nao truncado em dia), igual ao pedidosCompetenciaConfig do PHP. */
const competenciaDatetime = sql`coalesce(${caixaTurnos.aberto_em}, ${pedidos.criado_em})`;

function num(v: unknown): number {
  return Number(v ?? 0);
}

type FormaNormalizada = "pix" | "credito" | "debito" | "dinheiro" | "voucher" | "outro";

/** Mesma logica de admin/api/v1/caixa_resumo.php: minusculo, sem acento, casamento por substring. */
function normalizarForma(formaBruta: string | null | undefined): FormaNormalizada {
  const mapaAcentos: Record<string, string> = { ã: "a", á: "a", à: "a", â: "a", é: "e", ê: "e", í: "i", ó: "o", ô: "o", õ: "o", ú: "u", ç: "c" };
  let valor = (formaBruta ?? "").trim().toLowerCase();
  valor = valor.replace(/[ãáàâéêíóôõúç]/g, (c) => mapaAcentos[c] ?? c);

  if (valor === "pix" || valor.includes("pix")) return "pix";
  if (valor.includes("dinheiro") || valor.includes("cash")) return "dinheiro";
  if (valor.includes("debito")) return "debito";
  if (valor.includes("credito")) return "credito";
  if (valor.includes("voucher") || valor.includes("vale")) return "voucher";
  return "outro";
}

export type MovimentoCaixa = {
  uid: string;
  forma: FormaNormalizada;
  valor: number;
  criadoEm: string;
  observacoes: string;
  direcao: "entrada";
  origem: "LILLY";
};

export type CaixaResumoResultado =
  | { ok: true; caixa: null }
  | {
      ok: true;
      caixa: { id: number; status: "aberto" | "fechado"; saldoInicial: number; abertoEm: string; operador: string | null };
      resumo: {
        saldoInicialDia: number;
        pagamentos: Record<FormaNormalizada, number>;
        saldoEsperado: number;
        entradaTotal: number;
        saidaTotal: number;
        saldoTotal: number;
        troco: number;
        taxaMaquininha: number;
        sangriasTotal: number;
        totalVendas: number;
        taxaEntrega: number;
        totalSemTaxaEntrega: number;
      };
      movimentos: MovimentoCaixa[];
    };

export async function resumoCaixaAtual(lojaId: number): Promise<CaixaResumoResultado> {
  const caixaLinhas = await db
    .select({
      id: caixaTurnos.id,
      status: caixaTurnos.status,
      saldoInicial: caixaTurnos.saldo_inicial,
      abertoEm: caixaTurnos.aberto_em,
      operador: admins.nome,
    })
    .from(caixaTurnos)
    .leftJoin(admins, eq(admins.id, caixaTurnos.operador_id))
    .where(and(eq(caixaTurnos.status, "aberto"), eq(caixaTurnos.loja_id, lojaId)))
    .orderBy(desc(caixaTurnos.id))
    .limit(1);

  const caixaAtual = caixaLinhas[0];
  if (!caixaAtual) return { ok: true, caixa: null };

  const hoje = dataFortaleza();
  const diaAbertura = caixaAtual.abertoEm.slice(0, 10);
  const inicioOnline = `${diaAbertura} 00:00:00`;
  const dataLimiteFiado = diaAbertura < hoje ? `${hoje} 00:00:00` : caixaAtual.abertoEm;

  const wherePedidos = and(
    eq(pedidos.loja_id, lojaId),
    eq(pedidos.status, "finalizado"),
    sql`coalesce(${pedidos.forma_pagamento}, '') <> 'fiado'`,
    or(eq(pedidos.caixa_id, caixaAtual.id), and(isNull(pedidos.caixa_id), gte(competenciaDatetime, inicioOnline)))
  );

  const [resumoLinha] = await db
    .select({
      subtotal: sql<string>`coalesce(sum(${pedidos.subtotal}),0)`,
      desconto: sql<string>`coalesce(sum(${pedidos.desconto}),0)`,
      taxaEntrega: sql<string>`coalesce(sum(${pedidos.taxa_entrega}),0)`,
      taxaMaquininha: sql<string>`coalesce(sum(${pedidos.taxa_maquininha}),0)`,
      troco: sql<string>`coalesce(sum(${pedidos.troco}),0)`,
      totalVendas: sql<string>`coalesce(sum(${pedidos.total}),0)`,
    })
    .from(pedidos)
    .leftJoin(caixaTurnos, and(eq(caixaTurnos.id, pedidos.caixa_id), eq(caixaTurnos.loja_id, pedidos.loja_id)))
    .where(wherePedidos);

  const formaGroupExpr = sql<string>`coalesce(nullif(${pedidoPagamentos.forma}, ''), nullif(${pedidos.forma_pagamento}, ''), 'outro')`;
  const pagamentosLinhas = await db
    .select({ forma: formaGroupExpr, total: sql<string>`coalesce(sum(coalesce(${pedidoPagamentos.valor}, ${pedidos.total})),0)` })
    .from(pedidos)
    .leftJoin(pedidoPagamentos, and(eq(pedidoPagamentos.pedido_id, pedidos.id), eq(pedidoPagamentos.loja_id, pedidos.loja_id)))
    .leftJoin(caixaTurnos, and(eq(caixaTurnos.id, pedidos.caixa_id), eq(caixaTurnos.loja_id, pedidos.loja_id)))
    .where(wherePedidos)
    .groupBy(formaGroupExpr);

  const formaFiadoExpr = sql<string>`coalesce(nullif(${fiadoLancamentos.forma_pagamento}, ''), 'outro')`;
  const pagamentosFiadoLinhas = await db
    .select({ forma: formaFiadoExpr, total: sql<string>`coalesce(sum(${fiadoLancamentos.valor}),0)` })
    .from(fiadoLancamentos)
    .where(and(eq(fiadoLancamentos.loja_id, lojaId), eq(fiadoLancamentos.tipo, "pagamento"), gte(fiadoLancamentos.criado_em, dataLimiteFiado)))
    .groupBy(formaFiadoExpr);

  const totaisPagamento: Record<FormaNormalizada, number> = { pix: 0, credito: 0, debito: 0, dinheiro: 0, voucher: 0, outro: 0 };
  for (const p of [...pagamentosLinhas, ...pagamentosFiadoLinhas]) {
    totaisPagamento[normalizarForma(p.forma)] += num(p.total);
  }

  const totalVendas = num(resumoLinha?.totalVendas);
  const taxaEntrega = num(resumoLinha?.taxaEntrega);
  const taxaMaquininha = num(resumoLinha?.taxaMaquininha);
  const troco = num(resumoLinha?.troco);

  const [{ saldoInicialDia }] = await db
    .select({ saldoInicialDia: sql<string>`coalesce(sum(${caixaTurnos.saldo_inicial}),0)` })
    .from(caixaTurnos)
    .where(and(eq(caixaTurnos.loja_id, lojaId), sql`to_char(${caixaTurnos.aberto_em}, 'YYYY-MM-DD') = ${hoje}`));

  let suprimentosTotal = 0;
  let sangriasTotal = 0;
  const movsAgrupados = await db
    .select({ tipo: caixaMovimentacoes.tipo, total: sql<string>`coalesce(sum(${caixaMovimentacoes.valor}),0)` })
    .from(caixaMovimentacoes)
    .where(and(eq(caixaMovimentacoes.loja_id, lojaId), sql`to_char(${caixaMovimentacoes.criado_em}, 'YYYY-MM-DD') = ${hoje}`))
    .groupBy(caixaMovimentacoes.tipo);
  for (const m of movsAgrupados) {
    if (m.tipo === "suprimento") suprimentosTotal = num(m.total);
    else if (m.tipo === "sangria") sangriasTotal = num(m.total);
  }

  const pedidosLinhas = await db
    .select({
      pagamentoId: pedidoPagamentos.id,
      pedidoId: pedidos.id,
      codigo: pedidos.codigo,
      forma: sql<string>`lower(coalesce(nullif(${pedidoPagamentos.forma}, ''), nullif(${pedidos.forma_pagamento}, ''), 'outro'))`,
      valor: sql<string>`coalesce(${pedidoPagamentos.valor}, ${pedidos.total}, 0)`,
      criadoEm: sql<string>`coalesce(${pedidoPagamentos.criado_em}, ${pedidos.criado_em})`,
    })
    .from(pedidos)
    .leftJoin(pedidoPagamentos, and(eq(pedidoPagamentos.pedido_id, pedidos.id), eq(pedidoPagamentos.loja_id, pedidos.loja_id)))
    .leftJoin(caixaTurnos, and(eq(caixaTurnos.id, pedidos.caixa_id), eq(caixaTurnos.loja_id, pedidos.loja_id)))
    .where(wherePedidos);

  const movimentosPedidos: MovimentoCaixa[] = pedidosLinhas.map((p) => ({
    uid: p.pagamentoId ? `pg-${p.pagamentoId}` : `pd-${p.pedidoId}`,
    forma: normalizarForma(p.forma),
    valor: num(p.valor),
    criadoEm: p.criadoEm,
    observacoes: `Pedido #${p.codigo?.trim() ? p.codigo : p.pedidoId}`,
    direcao: "entrada",
    origem: "LILLY",
  }));

  const fiadoLinhas = await db
    .select({ id: fiadoLancamentos.id, forma: fiadoLancamentos.forma_pagamento, valor: fiadoLancamentos.valor, criadoEm: fiadoLancamentos.criado_em, nome: clientes.nome })
    .from(fiadoLancamentos)
    .innerJoin(clientes, and(eq(clientes.id, fiadoLancamentos.cliente_id), eq(clientes.loja_id, fiadoLancamentos.loja_id)))
    .where(and(eq(fiadoLancamentos.loja_id, lojaId), eq(fiadoLancamentos.tipo, "pagamento"), gte(fiadoLancamentos.criado_em, dataLimiteFiado)));

  const movimentosFiado: MovimentoCaixa[] = fiadoLinhas.map((f) => ({
    uid: `fp-${f.id}`,
    forma: normalizarForma(f.forma),
    valor: num(f.valor),
    criadoEm: f.criadoEm,
    observacoes: `Pagamento de fiado - ${f.nome ?? ""}`,
    direcao: "entrada",
    origem: "LILLY",
  }));

  const movimentos = [...movimentosPedidos, ...movimentosFiado].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : a.criadoEm > b.criadoEm ? -1 : 0));

  const saldoInicialNum = num(saldoInicialDia);
  const saldoEsperado = saldoInicialNum + totaisPagamento.dinheiro - troco + suprimentosTotal - sangriasTotal;
  const entradaTotal = Object.values(totaisPagamento).reduce((a, b) => a + b, 0) + suprimentosTotal;
  const saidaTotal = troco + taxaMaquininha + sangriasTotal;
  const saldoTotal = entradaTotal - saidaTotal;

  return {
    ok: true,
    caixa: {
      id: caixaAtual.id,
      status: caixaAtual.status,
      saldoInicial: caixaAtual.saldoInicial,
      abertoEm: caixaAtual.abertoEm,
      operador: caixaAtual.operador,
    },
    resumo: {
      saldoInicialDia: saldoInicialNum,
      pagamentos: totaisPagamento,
      saldoEsperado,
      entradaTotal,
      saidaTotal,
      saldoTotal,
      troco,
      taxaMaquininha,
      sangriasTotal,
      totalVendas,
      taxaEntrega,
      totalSemTaxaEntrega: totalVendas - taxaEntrega,
    },
    movimentos,
  };
}
