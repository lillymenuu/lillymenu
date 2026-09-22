import "server-only";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { pedidos, pedidoItens, pedidoPagamentos, clientes, caixaTurnos, fiadoLancamentos } from "@/db/schema";
import { pedidoCodigoBase, codigoDisplay } from "@/db/queries/pedidosAdmin";

/*
 * Equivalente de admin/api/v1/relatorios.php (/sales): resumo + graficos +
 * tabela paginada de pedidos do periodo. Mesma "competencia" (data do
 * caixa quando o pedido tem caixa_id, senao a data de criacao) usada em
 * dashboard.ts/caixaResumo.ts para o filtro de periodo e todas as
 * agregacoes, consistentemente (o legado antigo usava criterios
 * diferentes entre o resumo e a tabela — aqui os dois usam o mesmo).
 */

const dataCompetencia = sql<string>`to_char(coalesce(${caixaTurnos.aberto_em}, ${pedidos.criado_em}), 'YYYY-MM-DD')`;
const joinCaixa = and(eq(caixaTurnos.id, pedidos.caixa_id), eq(caixaTurnos.loja_id, pedidos.loja_id));

function resolverPeriodo(periodo: string, dataIni?: string, dataFim?: string): { inicio: string; fim: string } {
  const hojeISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
  if (periodo === "customizado") {
    return { inicio: dataIni || `${hojeISO.slice(0, 7)}-01`, fim: dataFim || hojeISO };
  }
  if (periodo === "7dias" || periodo === "30dias") {
    const dias = periodo === "7dias" ? 6 : 29;
    const [y, m, d] = hojeISO.split("-").map(Number);
    const inicioDt = new Date(Date.UTC(y, m - 1, d) - dias * 86_400_000);
    const inicio = `${inicioDt.getUTCFullYear()}-${String(inicioDt.getUTCMonth() + 1).padStart(2, "0")}-${String(inicioDt.getUTCDate()).padStart(2, "0")}`;
    return { inicio, fim: hojeISO };
  }
  return { inicio: hojeISO, fim: hojeISO };
}

export type RelatorioVendasInput = { lojaId: number; periodo?: string; dataIni?: string; dataFim?: string; tipo?: string; pagina?: number; limite?: number };

export type RelatorioVendasResultado = {
  resumo: { totalPedidos: number; faturamento: number; ticketMedio: number; taxaEntrega: number };
  fiadoRecebido: number;
  cancelados: number;
  canceladosValor: number;
  vendasPagamento: { forma: string; quantidade: number; total: number }[];
  produtos: { nome: string; quantidade: number }[];
  vendasProdutos: { nome: string; quantidade: number; total: number }[];
  clientesFrequencia: { nome: string; pedidos: number }[];
  pedidos: { id: number; codigo: number; total: number; status: string; tipo: string; formaPagamento: string; criadoEm: string; cliente: string }[];
  total: number;
  paginas: number;
  pagina: number;
  limite: number;
};

export async function relatorioVendas(input: RelatorioVendasInput): Promise<RelatorioVendasResultado> {
  const { lojaId } = input;
  const { inicio, fim } = resolverPeriodo(input.periodo ?? "hoje", input.dataIni, input.dataFim);
  const pagina0 = Math.max(1, input.pagina ?? 1);
  const limite = ([10, 20, 50] as const).includes(input.limite as never) ? (input.limite as 10 | 20 | 50) : 10;

  const condicoesBase = [eq(pedidos.loja_id, lojaId), sql`${dataCompetencia} between ${inicio} and ${fim}`];
  if (input.tipo) condicoesBase.push(eq(pedidos.tipo, input.tipo as "retirada" | "entrega" | "mesa"));

  const whereRelatorio = and(...condicoesBase, ne(pedidos.status, "cancelado"));
  const whereCancelados = and(...condicoesBase, eq(pedidos.status, "cancelado"));

  const [resumoLinha] = await db
    .select({ totalPedidos: sql<string>`count(*)`, faturamento: sql<string>`coalesce(sum(${pedidos.total}),0)`, taxaEntrega: sql<string>`coalesce(sum(${pedidos.taxa_entrega}),0)` })
    .from(pedidos)
    .leftJoin(caixaTurnos, joinCaixa)
    .where(whereRelatorio);

  const totalPedidos = Number(resumoLinha.totalPedidos);
  const faturamento = Number(resumoLinha.faturamento);
  const ticketMedio = totalPedidos > 0 ? faturamento / totalPedidos : 0;
  const taxaEntrega = Number(resumoLinha.taxaEntrega);

  const [{ v: fiadoRecebido }] = await db
    .select({ v: sql<string>`coalesce(sum(${fiadoLancamentos.valor}),0)` })
    .from(fiadoLancamentos)
    .where(and(eq(fiadoLancamentos.loja_id, lojaId), eq(fiadoLancamentos.tipo, "pagamento"), sql`${fiadoLancamentos.criado_em}::date between ${inicio}::date and ${fim}::date`));

  const [canceladosLinha] = await db
    .select({ totalCancelados: sql<string>`count(*)`, valorCancelados: sql<string>`coalesce(sum(${pedidos.total}),0)` })
    .from(pedidos)
    .leftJoin(caixaTurnos, joinCaixa)
    .where(whereCancelados);
  const cancelados = Number(canceladosLinha.totalCancelados);
  const canceladosValor = Number(canceladosLinha.valorCancelados);

  const produtosLinhas = await db
    .select({ nome: pedidoItens.produto_nome, quantidade: sql<string>`sum(${pedidoItens.quantidade})` })
    .from(pedidoItens)
    .innerJoin(pedidos, and(eq(pedidos.id, pedidoItens.pedido_id), eq(pedidoItens.loja_id, pedidos.loja_id)))
    .leftJoin(caixaTurnos, joinCaixa)
    .where(whereRelatorio)
    .groupBy(pedidoItens.produto_nome)
    .orderBy(desc(sql`sum(${pedidoItens.quantidade})`))
    .limit(10);
  const produtos = produtosLinhas.map((r) => ({ nome: r.nome ?? "", quantidade: Number(r.quantidade) }));

  const vendasProdutosLinhas = await db
    .select({ nome: pedidoItens.produto_nome, quantidade: sql<string>`sum(${pedidoItens.quantidade})`, total: sql<string>`coalesce(sum(${pedidoItens.preco} * ${pedidoItens.quantidade}),0)` })
    .from(pedidoItens)
    .innerJoin(pedidos, and(eq(pedidos.id, pedidoItens.pedido_id), eq(pedidoItens.loja_id, pedidos.loja_id)))
    .leftJoin(caixaTurnos, joinCaixa)
    .where(whereRelatorio)
    .groupBy(pedidoItens.produto_nome)
    .orderBy(desc(sql`coalesce(sum(${pedidoItens.preco} * ${pedidoItens.quantidade}),0)`))
    .limit(8);
  const vendasProdutos = vendasProdutosLinhas.map((r) => ({ nome: r.nome ?? "", quantidade: Number(r.quantidade), total: Number(r.total) }));

  const formaExpr = sql<string>`coalesce(nullif(${pedidoPagamentos.forma}, ''), 'sem_pagamento')`;
  let vendasPagamentoLinhas = await db
    .select({ forma: formaExpr, quantidade: sql<string>`count(*)`, total: sql<string>`coalesce(sum(${pedidoPagamentos.valor}),0)` })
    .from(pedidoPagamentos)
    .innerJoin(pedidos, and(eq(pedidos.id, pedidoPagamentos.pedido_id), eq(pedidoPagamentos.loja_id, pedidos.loja_id)))
    .leftJoin(caixaTurnos, joinCaixa)
    .where(whereRelatorio)
    .groupBy(formaExpr)
    .orderBy(desc(sql`coalesce(sum(${pedidoPagamentos.valor}),0)`));

  if (vendasPagamentoLinhas.length === 0) {
    const formaFallbackExpr = sql<string>`coalesce(nullif(${pedidos.forma_pagamento}, ''), 'sem_pagamento')`;
    vendasPagamentoLinhas = await db
      .select({ forma: formaFallbackExpr, quantidade: sql<string>`count(*)`, total: sql<string>`coalesce(sum(${pedidos.total}),0)` })
      .from(pedidos)
      .leftJoin(caixaTurnos, joinCaixa)
      .where(whereRelatorio)
      .groupBy(formaFallbackExpr)
      .orderBy(desc(sql`coalesce(sum(${pedidos.total}),0)`));
  }
  const vendasPagamento = vendasPagamentoLinhas.map((r) => ({ forma: r.forma, quantidade: Number(r.quantidade), total: Number(r.total) }));

  const clientesFrequenciaLinhas = await db
    .select({ nome: clientes.nome, pedidosCount: sql<string>`count(${pedidos.id})` })
    .from(clientes)
    .innerJoin(pedidos, and(eq(pedidos.cliente_id, clientes.id), eq(clientes.loja_id, pedidos.loja_id)))
    .leftJoin(caixaTurnos, joinCaixa)
    .where(whereRelatorio)
    .groupBy(clientes.id, clientes.nome)
    .orderBy(desc(sql`count(${pedidos.id})`))
    .limit(10);
  const clientesFrequencia = clientesFrequenciaLinhas.map((r) => ({ nome: r.nome ?? "", pedidos: Number(r.pedidosCount) }));

  const [{ total: totalPedidosTabela }] = await db.select({ total: sql<string>`count(*)` }).from(pedidos).leftJoin(caixaTurnos, joinCaixa).where(whereRelatorio);
  const totalTabela = Number(totalPedidosTabela);
  const paginas = Math.max(1, Math.ceil(totalTabela / limite));
  const pagina = Math.min(pagina0, paginas);
  const offset = (pagina - 1) * limite;

  const base = await pedidoCodigoBase(lojaId);
  const pedidosLinhas = await db
    .select({ id: pedidos.id, total: pedidos.total, status: pedidos.status, tipo: pedidos.tipo, formaPagamento: pedidos.forma_pagamento, criadoEm: pedidos.criado_em, cliente: clientes.nome })
    .from(pedidos)
    .innerJoin(clientes, and(eq(clientes.id, pedidos.cliente_id), eq(clientes.loja_id, pedidos.loja_id)))
    .leftJoin(caixaTurnos, joinCaixa)
    .where(whereRelatorio)
    .orderBy(desc(pedidos.criado_em))
    .limit(limite)
    .offset(offset);

  return {
    resumo: { totalPedidos, faturamento, ticketMedio, taxaEntrega },
    fiadoRecebido: Number(fiadoRecebido),
    cancelados,
    canceladosValor,
    vendasPagamento,
    produtos,
    vendasProdutos,
    clientesFrequencia,
    pedidos: pedidosLinhas.map((p) => ({ id: p.id, codigo: codigoDisplay(p.id, base), total: p.total ?? 0, status: p.status, tipo: p.tipo, formaPagamento: p.formaPagamento, criadoEm: p.criadoEm ?? "", cliente: p.cliente ?? "" })),
    total: totalTabela,
    paginas,
    pagina,
    limite,
  };
}
