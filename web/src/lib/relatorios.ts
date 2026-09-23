import "server-only";
import { relatorioVendas } from "@/db/queries/relatoriosVendas";

export type PedidoRelatorio = {
  id: number;
  codigo: number;
  total: number;
  status: string;
  tipo: string;
  forma_pagamento: string | null;
  criado_em: string;
  cliente: string;
};

export type VendaPagamento = { forma: string; quantidade: number; total: number };
export type VendaProduto = { nome: string; quantidade: number; total: number };
export type ProdutoRanking = { nome: string; quantidade: number };
export type ClienteFrequencia = { nome: string; pedidos: number };

export type RelatoriosResposta = {
  ok: true;
  resumo: {
    total_pedidos: number;
    faturamento: number;
    ticket_medio: number;
    taxa_entrega: number;
  };
  fiado_recebido: number;
  cancelados: number;
  cancelados_valor: number;
  vendas_pagamento: VendaPagamento[];
  produtos: ProdutoRanking[];
  vendas_produtos: VendaProduto[];
  clientes_frequencia: ClienteFrequencia[];
  pedidos: PedidoRelatorio[];
  total: number;
  paginas: number;
  pagina: number;
  limite: number;
};

export type RelatoriosParams = {
  periodo?: string;
  data_ini?: string;
  data_fim?: string;
  tipo?: string;
  pagina?: number;
  limite?: number;
};

export async function getRelatorios(lojaId: number, params: RelatoriosParams = {}): Promise<RelatoriosResposta> {
  const resultado = await relatorioVendas({
    lojaId,
    periodo: params.periodo,
    dataIni: params.data_ini,
    dataFim: params.data_fim,
    tipo: params.tipo,
    pagina: params.pagina,
    limite: params.limite,
  });

  return {
    ok: true,
    resumo: {
      total_pedidos: resultado.resumo.totalPedidos,
      faturamento: resultado.resumo.faturamento,
      ticket_medio: resultado.resumo.ticketMedio,
      taxa_entrega: resultado.resumo.taxaEntrega,
    },
    fiado_recebido: resultado.fiadoRecebido,
    cancelados: resultado.cancelados,
    cancelados_valor: resultado.canceladosValor,
    vendas_pagamento: resultado.vendasPagamento,
    produtos: resultado.produtos,
    vendas_produtos: resultado.vendasProdutos,
    clientes_frequencia: resultado.clientesFrequencia,
    pedidos: resultado.pedidos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      total: p.total,
      status: p.status,
      tipo: p.tipo,
      forma_pagamento: p.formaPagamento,
      criado_em: p.criadoEm,
      cliente: p.cliente,
    })),
    total: resultado.total,
    paginas: resultado.paginas,
    pagina: resultado.pagina,
    limite: resultado.limite,
  };
}
