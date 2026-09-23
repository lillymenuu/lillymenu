import "server-only";
import { relatorioClientes } from "@/db/queries/relatoriosClientes";

export type ClienteRelatorio = {
  cliente_id: number;
  nome: string;
  telefone: string;
  ultimo_pedido: string;
  total_taxa: number;
  ticket_medio: number;
  total_gasto: number;
  pedidos_feitos: number;
};

export type RelatoriosClientesParams = {
  busca?: string;
  ordenar?: string;
  periodo?: string;
  data_ini?: string;
  data_fim?: string;
  pagina?: number;
  limite?: number;
};

export type RelatoriosClientesResposta = {
  ok: true;
  clientes: ClienteRelatorio[];
  total: number;
  paginas: number;
  pagina: number;
  limite: number;
};

const ORDENAR_VALIDOS = ["total_gasto", "pedidos", "ticket_medio", "ultimo_pedido", "nome"] as const;

export async function getRelatoriosClientes(lojaId: number, params: RelatoriosClientesParams = {}): Promise<RelatoriosClientesResposta> {
  const ordenar = params.ordenar && (ORDENAR_VALIDOS as readonly string[]).includes(params.ordenar) ? (params.ordenar as (typeof ORDENAR_VALIDOS)[number]) : undefined;

  const resultado = await relatorioClientes({
    lojaId,
    busca: params.busca,
    ordenar,
    periodo: params.periodo,
    dataIni: params.data_ini,
    dataFim: params.data_fim,
    pagina: params.pagina,
    limite: params.limite,
  });

  return {
    ok: true,
    clientes: resultado.clientes.map((c) => ({
      cliente_id: c.clienteId,
      nome: c.nome,
      telefone: c.telefone ?? "",
      ultimo_pedido: c.ultimoPedido ?? "",
      total_taxa: c.totalTaxa,
      ticket_medio: c.ticketMedio,
      total_gasto: c.totalGasto,
      pedidos_feitos: c.pedidosFeitos,
    })),
    total: resultado.total,
    paginas: resultado.paginas,
    pagina: resultado.pagina,
    limite: resultado.limite,
  };
}
