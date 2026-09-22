import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { pedidos, pedidoItens, clientes } from "@/db/schema";

/* Equivalente de admin/api/v1/relatorio_cross_sell.php (/crosssellreport). */

function resolverPeriodo(periodo: string, dataIni?: string, dataFim?: string): { periodo: string; inicio: string; fim: string } {
  const hojeISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
  if (periodo === "customizado") {
    return { periodo, inicio: dataIni || `${hojeISO.slice(0, 7)}-01`, fim: dataFim || hojeISO };
  }
  if (periodo === "7dias" || periodo === "30dias") {
    const dias = periodo === "7dias" ? 6 : 29;
    const [y, m, d] = hojeISO.split("-").map(Number);
    const inicioDt = new Date(Date.UTC(y, m - 1, d) - dias * 86_400_000);
    const inicio = `${inicioDt.getUTCFullYear()}-${String(inicioDt.getUTCMonth() + 1).padStart(2, "0")}-${String(inicioDt.getUTCDate()).padStart(2, "0")}`;
    return { periodo, inicio, fim: hojeISO };
  }
  return { periodo: "hoje", inicio: hojeISO, fim: hojeISO };
}

export type RelatorioCrossSellInput = { lojaId: number; periodo?: string; dataIni?: string; dataFim?: string };

export type RelatorioCrossSellResultado = {
  periodo: { inicio: string; fim: string };
  resumo: { faturamento: number; itensVendidos: number; pedidosCrossSell: number; ticketMedio: number };
  porDia: { dia: string; valor: number }[];
  topProdutos: { nome: string; qtd: number; valor: number }[];
  itens: { codigo: string; cliente: string; produtoNome: string | null; quantidade: number; preco: number; subtotal: number; criadoEm: string | null }[];
};

export async function relatorioCrossSell(input: RelatorioCrossSellInput): Promise<RelatorioCrossSellResultado> {
  const { lojaId } = input;
  const { inicio, fim } = resolverPeriodo(input.periodo ?? "hoje", input.dataIni, input.dataFim);

  const where = and(eq(pedidoItens.loja_id, lojaId), eq(pedidoItens.cross_sell, true), ne(pedidos.status, "cancelado"), sql`${pedidos.criado_em}::date between ${inicio}::date and ${fim}::date`);

  const [resumoLinha] = await db
    .select({ faturamento: sql<string>`coalesce(sum(${pedidoItens.preco} * ${pedidoItens.quantidade}),0)`, itens: sql<string>`coalesce(sum(${pedidoItens.quantidade}),0)`, pedidosCount: sql<string>`count(distinct ${pedidoItens.pedido_id})` })
    .from(pedidoItens)
    .innerJoin(pedidos, and(eq(pedidos.id, pedidoItens.pedido_id), eq(pedidos.loja_id, pedidoItens.loja_id)))
    .where(where);

  const faturamento = Number(resumoLinha.faturamento);
  const itensVendidos = Number(resumoLinha.itens);
  const pedidosCrossSell = Number(resumoLinha.pedidosCount);
  const ticketMedio = pedidosCrossSell > 0 ? faturamento / pedidosCrossSell : 0;

  const porDiaLinhas = await db
    .select({ dia: sql<string>`${pedidos.criado_em}::date::text`, valor: sql<string>`sum(${pedidoItens.preco} * ${pedidoItens.quantidade})` })
    .from(pedidoItens)
    .innerJoin(pedidos, and(eq(pedidos.id, pedidoItens.pedido_id), eq(pedidos.loja_id, pedidoItens.loja_id)))
    .where(where)
    .groupBy(sql`${pedidos.criado_em}::date`)
    .orderBy(sql`${pedidos.criado_em}::date`);

  const topProdutosLinhas = await db
    .select({ nome: pedidoItens.produto_nome, qtd: sql<string>`sum(${pedidoItens.quantidade})`, valor: sql<string>`sum(${pedidoItens.preco} * ${pedidoItens.quantidade})` })
    .from(pedidoItens)
    .innerJoin(pedidos, and(eq(pedidos.id, pedidoItens.pedido_id), eq(pedidos.loja_id, pedidoItens.loja_id)))
    .where(where)
    .groupBy(pedidoItens.produto_nome)
    .orderBy(sql`sum(${pedidoItens.preco} * ${pedidoItens.quantidade}) desc`)
    .limit(8);

  const itensLinhas = await db
    .select({
      codigo: sql<string>`${pedidos.id}::text`,
      cliente: sql<string>`coalesce(${clientes.nome}, 'Cliente')`,
      produtoNome: pedidoItens.produto_nome,
      quantidade: pedidoItens.quantidade,
      preco: pedidoItens.preco,
      subtotal: sql<string>`${pedidoItens.preco} * ${pedidoItens.quantidade}`,
      criadoEm: pedidos.criado_em,
    })
    .from(pedidoItens)
    .innerJoin(pedidos, and(eq(pedidos.id, pedidoItens.pedido_id), eq(pedidos.loja_id, pedidoItens.loja_id)))
    .leftJoin(clientes, eq(clientes.id, pedidos.cliente_id))
    .where(where)
    .orderBy(sql`${pedidos.criado_em} desc`)
    .limit(30);

  return {
    periodo: { inicio, fim },
    resumo: { faturamento, itensVendidos, pedidosCrossSell, ticketMedio },
    porDia: porDiaLinhas.map((r) => ({ dia: r.dia, valor: Number(r.valor) })),
    topProdutos: topProdutosLinhas.map((r) => ({ nome: r.nome ?? "", qtd: Number(r.qtd), valor: Number(r.valor) })),
    itens: itensLinhas.map((i) => ({ codigo: i.codigo, cliente: i.cliente, produtoNome: i.produtoNome, quantidade: i.quantidade ?? 0, preco: i.preco ?? 0, subtotal: Number(i.subtotal), criadoEm: i.criadoEm })),
  };
}
