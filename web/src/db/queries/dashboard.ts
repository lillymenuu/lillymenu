import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { pedidos, caixaTurnos, clientes, lojaEventos, pedidoItens, produtos, estoque } from "@/db/schema";
import { getConfig } from "@/db/queries/config";

/*
 * Equivalente de admin/api/v1/dashboard.php: KPIs, grafico de pedidos/faturamento
 * (7/15/30 dias) e top 5 produtos. Mesma "data de competencia" do PHP
 * (pedidos_competencia.php): quando o pedido tem caixa_id, conta na data de
 * ABERTURA do caixa (nao na hora exata do pedido) — assim uma venda feita
 * depois da meia-noite ainda entra no dia do turno.
 */

const PERIODOS_VALIDOS = [7, 15, 30] as const;
export type Periodo = (typeof PERIODOS_VALIDOS)[number];

function normalizarPeriodo(periodo: number): Periodo {
  return (PERIODOS_VALIDOS as readonly number[]).includes(periodo) ? (periodo as Periodo) : 7;
}

/** DATE(COALESCE(caixa_turnos.aberto_em, pedidos.criado_em)), como string "YYYY-MM-DD". */
const dataCompetencia = sql<string>`to_char(coalesce(${caixaTurnos.aberto_em}, ${pedidos.criado_em}), 'YYYY-MM-DD')`;

function hojeEmFortaleza(): Date {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
  return new Date(`${partes}T00:00:00`);
}

function formatarISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatarDiaMes(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type DashboardKpis = {
  receitaMesAtual: number;
  faixaReceitaMes: string;
  pedidosPeriodo: number;
  receitaPeriodo: number;
  clientesCadastrados: number;
  acessosMenu: number;
};

export type DashboardGrafico = {
  labels: string[];
  seriePedidos: number[];
  serieValores: number[];
};

export type DashboardTopProduto = { nome: string; valor: number; saidas: number; estoque: number };

export type DashboardData = {
  periodo: Periodo;
  loja: { nome: string; verificada: boolean };
  kpis: DashboardKpis;
  grafico: DashboardGrafico;
  topProdutos: DashboardTopProduto[];
};

export async function montarDashboard(lojaId: number, periodoBruto: number): Promise<DashboardData> {
  const periodo = normalizarPeriodo(periodoBruto);
  const hoje = hojeEmFortaleza();

  const inicioPeriodo = new Date(hoje);
  inicioPeriodo.setDate(inicioPeriodo.getDate() - (periodo - 1));
  const inicioPeriodoStr = formatarISO(inicioPeriodo);

  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const inicioMesStr = formatarISO(inicioMes);
  const fimMesStr = formatarISO(fimMes);

  /* serie diaria do periodo, so pedidos finalizados */
  const serieRaw = await db
    .select({
      dia: dataCompetencia,
      totalPedidos: sql<number>`count(*)`,
      totalValor: sql<number>`coalesce(sum(${pedidos.total}), 0)`,
    })
    .from(pedidos)
    .leftJoin(caixaTurnos, and(eq(caixaTurnos.id, pedidos.caixa_id), eq(caixaTurnos.loja_id, pedidos.loja_id)))
    .where(and(eq(pedidos.loja_id, lojaId), eq(pedidos.status, "finalizado"), gte(dataCompetencia, inicioPeriodoStr)))
    .groupBy(dataCompetencia);

  const mapPedidos = new Map(serieRaw.map((r) => [r.dia, Number(r.totalPedidos)]));
  const mapValores = new Map(serieRaw.map((r) => [r.dia, Number(r.totalValor)]));

  const labels: string[] = [];
  const seriePedidos: number[] = [];
  const serieValores: number[] = [];
  let pedidosPeriodo = 0;
  let receitaPeriodo = 0;
  const cursor = new Date(inicioPeriodo);
  for (let i = 0; i < periodo; i++) {
    const diaStr = formatarISO(cursor);
    labels.push(formatarDiaMes(cursor));
    const qtd = mapPedidos.get(diaStr) ?? 0;
    const valor = Math.round((mapValores.get(diaStr) ?? 0) * 100) / 100;
    seriePedidos.push(qtd);
    serieValores.push(valor);
    pedidosPeriodo += qtd;
    receitaPeriodo += valor;
    cursor.setDate(cursor.getDate() + 1);
  }
  receitaPeriodo = Math.round(receitaPeriodo * 100) / 100;

  /* receita do mes corrente (mesma competencia, sem limite de periodo) */
  const receitaMesLinhas = await db
    .select({ total: sql<number>`coalesce(sum(${pedidos.total}), 0)` })
    .from(pedidos)
    .leftJoin(caixaTurnos, and(eq(caixaTurnos.id, pedidos.caixa_id), eq(caixaTurnos.loja_id, pedidos.loja_id)))
    .where(
      and(
        eq(pedidos.loja_id, lojaId),
        eq(pedidos.status, "finalizado"),
        gte(dataCompetencia, inicioMesStr),
        lte(dataCompetencia, fimMesStr)
      )
    );
  const receitaMesAtual = Math.round(Number(receitaMesLinhas[0]?.total ?? 0) * 100) / 100;

  /* acessos ao cardapio no mes (loja_eventos.tipo = 'visita') */
  const acessosLinhas = await db
    .select({ n: sql<number>`count(*)` })
    .from(lojaEventos)
    .where(
      and(
        eq(lojaEventos.loja_id, lojaId),
        eq(lojaEventos.tipo, "visita"),
        gte(lojaEventos.criado_em, `${inicioMesStr} 00:00:00`),
        lte(lojaEventos.criado_em, `${fimMesStr} 23:59:59`)
      )
    );
  const acessosMenu = Number(acessosLinhas[0]?.n ?? 0);

  const clientesLinhas = await db.select({ n: sql<number>`count(*)` }).from(clientes).where(eq(clientes.loja_id, lojaId));
  const clientesCadastrados = Number(clientesLinhas[0]?.n ?? 0);

  /* top 5 produtos por saidas (soma de pedido_itens.quantidade em pedidos finalizados) */
  const topRaw = await db
    .select({
      produtoId: sql<number | null>`coalesce(${produtos.id}, ${pedidoItens.produto_id})`,
      nome: sql<string | null>`coalesce(${produtos.nome}, ${pedidoItens.produto_nome})`,
      valor: sql<number | null>`coalesce(${produtos.preco}, ${pedidoItens.preco})`,
      estoqueQtd: sql<number>`coalesce(${estoque.quantidade}, 0)`,
      saidas: sql<number>`sum(${pedidoItens.quantidade})`,
    })
    .from(pedidoItens)
    .innerJoin(pedidos, eq(pedidos.id, pedidoItens.pedido_id))
    .leftJoin(
      produtos,
      and(
        sql`(${produtos.id} = nullif(${pedidoItens.produto_id}, 0) or ((${pedidoItens.produto_id} is null or ${pedidoItens.produto_id} = 0) and ${produtos.nome} = ${pedidoItens.produto_nome}))`,
        eq(produtos.loja_id, lojaId)
      )
    )
    .leftJoin(estoque, and(eq(estoque.produto_id, produtos.id), eq(estoque.loja_id, lojaId)))
    .where(and(eq(pedidos.status, "finalizado"), eq(pedidos.loja_id, lojaId), eq(pedidoItens.loja_id, lojaId)))
    .groupBy(sql`coalesce(${produtos.id}, ${pedidoItens.produto_id})`, sql`coalesce(${produtos.nome}, ${pedidoItens.produto_nome})`, sql`coalesce(${produtos.preco}, ${pedidoItens.preco})`, estoque.quantidade)
    .orderBy(sql`sum(${pedidoItens.quantidade}) desc`)
    .limit(5);

  const topProdutos: DashboardTopProduto[] = topRaw.map((p) => ({
    nome: p.nome ?? "Produto",
    valor: Number(p.valor ?? 0),
    saidas: Number(p.saidas ?? 0),
    estoque: Number(p.estoqueQtd ?? 0),
  }));

  const lojaNome = (await getConfig(lojaId, "nome_loja")) || "Minha Loja";
  const lojaVerificada = (await getConfig(lojaId, "loja_verificada")) === "1";

  return {
    periodo,
    loja: { nome: lojaNome, verificada: lojaVerificada },
    kpis: {
      receitaMesAtual,
      faixaReceitaMes: `${formatarDiaMes(inicioMes)} a ${formatarDiaMes(fimMes)}`,
      pedidosPeriodo,
      receitaPeriodo,
      clientesCadastrados,
      acessosMenu,
    },
    grafico: { labels, seriePedidos, serieValores },
    topProdutos,
  };
}
