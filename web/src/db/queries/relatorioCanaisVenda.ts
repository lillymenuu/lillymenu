import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { pedidos } from "@/db/schema";

/*
 * Relatorio de canais de venda (/saleschannels): compara o desempenho do
 * PDV (balcao) com o cardapio digital (loja). O modo Garcom (origem
 * "garcom") fica de fora por decisao de produto — e pedido de mesa, nao um
 * canal de venda alternativo nessa comparacao. Marketplaces (iFood, Keeta,
 * 99Food) ainda nao tem integracao no sistema, entao tambem nao entram.
 */

export const CANAIS_VENDA = {
  balcao: "PDV (painel)",
  loja: "Cardápio digital (link)",
} as const;

export type CanalVendaOrigem = keyof typeof CANAIS_VENDA;

const ORIGENS_VALIDAS = Object.keys(CANAIS_VENDA) as CanalVendaOrigem[];

function resolverPeriodo(periodo: string, dataIni?: string, dataFim?: string): { inicio: string; fim: string } {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
  if (dataIni && dataFim) return { inicio: `${dataIni} 00:00:00`, fim: `${dataFim} 23:59:59` };
  if (periodo === "7dias" || periodo === "30dias") {
    const dias = periodo === "7dias" ? 6 : 29;
    const [y, m, d] = hoje.split("-").map(Number);
    const inicioDt = new Date(Date.UTC(y, m - 1, d) - dias * 86_400_000);
    const inicio = `${inicioDt.getUTCFullYear()}-${String(inicioDt.getUTCMonth() + 1).padStart(2, "0")}-${String(inicioDt.getUTCDate()).padStart(2, "0")}`;
    return { inicio: `${inicio} 00:00:00`, fim: `${hoje} 23:59:59` };
  }
  return { inicio: `${hoje} 00:00:00`, fim: `${hoje} 23:59:59` };
}

export type RelatorioCanaisVendaInput = {
  lojaId: number;
  periodo?: string;
  dataIni?: string;
  dataFim?: string;
  canal?: string;
};

export type RelatorioCanalLinha = {
  origem: CanalVendaOrigem;
  label: string;
  pedidos: number;
  total: number;
  ticketMedio: number;
  percentualTotal: number;
};

export type RelatorioCanaisVendaResultado = {
  periodo: { inicio: string; fim: string };
  resumo: { totalVendido: number; quantidadePedidos: number; ticketMedio: number };
  canais: RelatorioCanalLinha[];
};

export async function relatorioCanaisVenda(input: RelatorioCanaisVendaInput): Promise<RelatorioCanaisVendaResultado> {
  const { lojaId } = input;
  const { inicio, fim } = resolverPeriodo(input.periodo ?? "hoje", input.dataIni, input.dataFim);
  const canalFiltro = input.canal && ORIGENS_VALIDAS.includes(input.canal as CanalVendaOrigem) ? (input.canal as CanalVendaOrigem) : undefined;
  const origensConsideradas = canalFiltro ? [canalFiltro] : ORIGENS_VALIDAS;

  const where = and(
    eq(pedidos.loja_id, lojaId),
    eq(pedidos.status, "finalizado"),
    inArray(pedidos.origem, origensConsideradas),
    sql`${pedidos.criado_em} between ${inicio}::timestamp and ${fim}::timestamp`
  );

  const linhas = await db
    .select({
      origem: pedidos.origem,
      pedidos: sql<string>`count(*)`,
      total: sql<string>`coalesce(sum(${pedidos.total}),0)`,
    })
    .from(pedidos)
    .where(where)
    .groupBy(pedidos.origem);

  const mapa = new Map(linhas.map((l) => [l.origem as CanalVendaOrigem, l]));
  const totalGeral = linhas.reduce((acc, l) => acc + Number(l.total), 0);
  const pedidosGeral = linhas.reduce((acc, l) => acc + Number(l.pedidos), 0);

  const canais: RelatorioCanalLinha[] = origensConsideradas
    .map((origem) => {
      const linha = mapa.get(origem);
      const totalCanal = linha ? Number(linha.total) : 0;
      const pedidosCanal = linha ? Number(linha.pedidos) : 0;
      return {
        origem,
        label: CANAIS_VENDA[origem],
        pedidos: pedidosCanal,
        total: totalCanal,
        ticketMedio: pedidosCanal > 0 ? totalCanal / pedidosCanal : 0,
        percentualTotal: totalGeral > 0 ? (totalCanal / totalGeral) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    periodo: { inicio, fim },
    resumo: {
      totalVendido: totalGeral,
      quantidadePedidos: pedidosGeral,
      ticketMedio: pedidosGeral > 0 ? totalGeral / pedidosGeral : 0,
    },
    canais,
  };
}
