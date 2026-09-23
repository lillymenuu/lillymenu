import "server-only";
import { and, desc, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { clientes, pedidos, cashbackMovimentacoes } from "@/db/schema";
import { dataFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/relatorios_fidelidade.php (/loyaltyreports).
 * Efeito colateral preservado do legado: visualizar este relatorio expira
 * "lazy" qualquer saldo de cashback (tipo='entrada') cujo expira_em ja
 * passou — grava o 'expirado' em cashback_movimentacoes e desconta de
 * clientes.cashback_saldo, tudo numa unica transacao.
 */

const DIAS_VALIDOS = ["7", "15", "30", "60", "90", "365"] as const;

function resolverPeriodo(periodo: string, dataIni?: string, dataFim?: string): { inicio: string; fim: string } {
  const hoje = dataFortaleza();
  if (dataIni && dataFim) return { inicio: `${dataIni} 00:00:00`, fim: `${dataFim} 23:59:59` };
  if (periodo === "hoje") return { inicio: `${hoje} 00:00:00`, fim: `${hoje} 23:59:59` };

  const dias = (DIAS_VALIDOS as readonly string[]).includes(periodo) ? Number(periodo) : 30;
  const [y, m, d] = hoje.split("-").map(Number);
  const inicioDt = new Date(Date.UTC(y, m - 1, d) - (dias - 1) * 86_400_000);
  const inicio = `${inicioDt.getUTCFullYear()}-${String(inicioDt.getUTCMonth() + 1).padStart(2, "0")}-${String(inicioDt.getUTCDate()).padStart(2, "0")}`;
  return { inicio: `${inicio} 00:00:00`, fim: `${hoje} 23:59:59` };
}

async function expirarCashbackVencido(lojaId: number): Promise<void> {
  const hoje = dataFortaleza();

  const vencidos = await db
    .select({
      id: cashbackMovimentacoes.id,
      clienteId: cashbackMovimentacoes.cliente_id,
      valor: cashbackMovimentacoes.valor,
      expiraEm: cashbackMovimentacoes.expira_em,
      // Correlacao via nome literal da tabela externa (nao interpolado como
      // coluna): interpolar ${cashbackMovimentacoes.id} rendia so "id" sem
      // qualificar, e como a subquery e um self-join na MESMA tabela (aliased
      // "u"), o Postgres resolvia pro "id"/"loja_id" da propria subquery,
      // fazendo "usado" ficar sempre 0 (coalesce cai no fallback).
      usado: sql<string>`coalesce((select sum(u.valor) from cashback_movimentacoes u where u.referencia_id = cashback_movimentacoes.id and u.loja_id = cashback_movimentacoes.loja_id and u.tipo in ('uso','expirado')), 0)`,
    })
    .from(cashbackMovimentacoes)
    .where(and(eq(cashbackMovimentacoes.tipo, "entrada"), eq(cashbackMovimentacoes.loja_id, lojaId), isNotNull(cashbackMovimentacoes.expira_em), lt(cashbackMovimentacoes.expira_em, hoje)));

  const candidatos = vencidos.filter((v) => v.valor - Number(v.usado) > 0.009);
  if (candidatos.length === 0) return;

  await withTransaction(async (tx) => {
    const saldosCache = new Map<number, number>();
    for (const venc of candidatos) {
      const restante = venc.valor - Number(venc.usado);
      if (restante <= 0.009) continue;

      if (!saldosCache.has(venc.clienteId)) {
        const [cliente] = await tx.select({ saldo: clientes.cashback_saldo }).from(clientes).where(and(eq(clientes.id, venc.clienteId), eq(clientes.loja_id, lojaId))).limit(1);
        saldosCache.set(venc.clienteId, cliente?.saldo ?? 0);
      }

      const saldoAntes = saldosCache.get(venc.clienteId) as number;
      const expirar = Math.min(restante, saldoAntes);
      if (expirar <= 0.009) continue;

      const saldoDepois = Math.max(0, saldoAntes - expirar);
      await tx.update(clientes).set({ cashback_saldo: saldoDepois }).where(and(eq(clientes.id, venc.clienteId), eq(clientes.loja_id, lojaId)));
      await tx.insert(cashbackMovimentacoes).values({ cliente_id: venc.clienteId, pedido_id: null, tipo: "expirado", valor: expirar, saldo_antes: saldoAntes, saldo_depois: saldoDepois, expira_em: venc.expiraEm, referencia_id: venc.id, loja_id: lojaId });
      saldosCache.set(venc.clienteId, saldoDepois);
    }
  });
}

export type ClienteFidelidade = { nome: string; criadoEm: string | null; saldo: number; usado: number; expiraEm: string | null };
export type HistoricoFidelidade = { tipo: "Entrada de saldo" | "Saída de saldo" | "Expirado"; classe: "positivo" | "negativo"; data: string | null; valor: number };

export type RelatorioFidelidadeInput = { lojaId: number; periodo?: string; dataIni?: string; dataFim?: string };

export type RelatorioFidelidadeResultado = {
  dataIni: string;
  dataFim: string;
  cashbackSaldoBase: number;
  cashbackUtilizado: number;
  pedidosComCashback: number;
  clientes: ClienteFidelidade[];
  historico: HistoricoFidelidade[];
  cupomDesconto: number;
  cupomPedidos: number;
};

export async function relatorioFidelidade(input: RelatorioFidelidadeInput): Promise<RelatorioFidelidadeResultado> {
  const { lojaId } = input;
  const { inicio, fim } = resolverPeriodo(input.periodo ?? "hoje", input.dataIni, input.dataFim);

  await expirarCashbackVencido(lojaId);

  const [{ v: cashbackSaldoBase }] = await db.select({ v: sql<string>`coalesce(sum(${clientes.cashback_saldo}),0)` }).from(clientes).where(eq(clientes.loja_id, lojaId));

  const [{ v: cashbackUtilizado }] = await db
    .select({ v: sql<string>`coalesce(sum(${cashbackMovimentacoes.valor}),0)` })
    .from(cashbackMovimentacoes)
    .where(and(eq(cashbackMovimentacoes.tipo, "uso"), eq(cashbackMovimentacoes.loja_id, lojaId), sql`${cashbackMovimentacoes.criado_em} between ${inicio} and ${fim}`));

  const [{ n: pedidosComCashback }] = await db
    .select({ n: sql<string>`count(*)` })
    .from(pedidos)
    .where(and(eq(pedidos.loja_id, lojaId), sql`${pedidos.criado_em} between ${inicio} and ${fim}`, sql`${pedidos.status} <> 'cancelado'`, eq(pedidos.cashback_aplicado, true)));

  const [cupomLinha] = await db
    .select({ total: sql<string>`count(*)`, desconto: sql<string>`coalesce(sum(${pedidos.desconto}),0)` })
    .from(pedidos)
    .where(and(eq(pedidos.loja_id, lojaId), sql`${pedidos.criado_em} between ${inicio} and ${fim}`, sql`${pedidos.status} <> 'cancelado'`, isNotNull(pedidos.cupom), sql`${pedidos.cupom} <> ''`));

  const clientesRows = await db
    .select({ id: clientes.id, nome: clientes.nome, criadoEm: clientes.criado_em, saldo: clientes.cashback_saldo })
    .from(clientes)
    .where(eq(clientes.loja_id, lojaId))
    .orderBy(desc(clientes.cashback_saldo))
    .limit(10);

  const idsClientes = clientesRows.map((c) => c.id);
  const extrasMap = new Map<number, { usado: number; expiraEm: string | null }>();
  if (idsClientes.length > 0) {
    const extras = await db
      .select({ clienteId: cashbackMovimentacoes.cliente_id, usado: sql<string>`sum(case when ${cashbackMovimentacoes.tipo} = 'uso' then ${cashbackMovimentacoes.valor} else 0 end)`, expiraEm: sql<string | null>`min(case when ${cashbackMovimentacoes.tipo} = 'entrada' then ${cashbackMovimentacoes.expira_em} end)` })
      .from(cashbackMovimentacoes)
      .where(and(inArray(cashbackMovimentacoes.cliente_id, idsClientes), eq(cashbackMovimentacoes.loja_id, lojaId)))
      .groupBy(cashbackMovimentacoes.cliente_id);
    for (const e of extras) extrasMap.set(e.clienteId, { usado: Number(e.usado ?? 0), expiraEm: e.expiraEm });
  }

  const clientesResultado: ClienteFidelidade[] = clientesRows.map((c) => {
    const extra = extrasMap.get(c.id);
    return { nome: c.nome ?? "-", criadoEm: c.criadoEm, saldo: c.saldo, usado: extra?.usado ?? 0, expiraEm: extra?.expiraEm ?? null };
  });

  const historicoRows = await db
    .select({ tipo: cashbackMovimentacoes.tipo, valor: cashbackMovimentacoes.valor, criadoEm: cashbackMovimentacoes.criado_em, expiraEm: cashbackMovimentacoes.expira_em })
    .from(cashbackMovimentacoes)
    .where(and(eq(cashbackMovimentacoes.loja_id, lojaId), sql`${cashbackMovimentacoes.criado_em} between ${inicio} and ${fim}`, inArray(cashbackMovimentacoes.tipo, ["entrada", "uso", "expirado"])))
    .orderBy(desc(cashbackMovimentacoes.criado_em))
    .limit(40);

  const historico: HistoricoFidelidade[] = [];
  for (const row of historicoRows) {
    const dataRef = row.tipo === "expirado" && row.expiraEm ? row.expiraEm : row.criadoEm;
    if (row.tipo === "entrada") historico.push({ tipo: "Entrada de saldo", classe: "positivo", data: dataRef, valor: row.valor });
    else if (row.tipo === "uso") historico.push({ tipo: "Saída de saldo", classe: "negativo", data: dataRef, valor: -row.valor });
    else if (row.tipo === "expirado") historico.push({ tipo: "Expirado", classe: "negativo", data: dataRef, valor: -row.valor });
  }
  historico.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));

  return {
    dataIni: inicio.slice(0, 10),
    dataFim: fim.slice(0, 10),
    cashbackSaldoBase: Number(cashbackSaldoBase),
    cashbackUtilizado: Number(cashbackUtilizado),
    pedidosComCashback: Number(pedidosComCashback),
    clientes: clientesResultado,
    historico: historico.slice(0, 20),
    cupomDesconto: Number(cupomLinha.desconto),
    cupomPedidos: Number(cupomLinha.total),
  };
}
