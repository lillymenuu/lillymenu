import "server-only";
import { relatorioCrossSell } from "@/db/queries/relatorioCrossSell";

export type CrossSellPorDia = { dia: string; valor: number };
export type CrossSellTopProduto = { nome: string; qtd: number; valor: number };
export type CrossSellItem = {
  codigo: string;
  cliente: string;
  produto_nome: string;
  quantidade: number;
  preco: number;
  subtotal: number;
  criado_em: string;
};

export type CrossSellReportResposta = {
  ok: true;
  periodo: { inicio: string; fim: string };
  resumo: {
    faturamento: number;
    itens_vendidos: number;
    pedidos_cross_sell: number;
    ticket_medio: number;
  };
  por_dia: CrossSellPorDia[];
  top_produtos: CrossSellTopProduto[];
  itens: CrossSellItem[];
};

export type CrossSellReportParams = {
  periodo?: string;
  data_ini?: string;
  data_fim?: string;
};

export async function getCrossSellReport(lojaId: number, params: CrossSellReportParams = {}): Promise<CrossSellReportResposta> {
  const resultado = await relatorioCrossSell({ lojaId, periodo: params.periodo, dataIni: params.data_ini, dataFim: params.data_fim });
  return {
    ok: true,
    periodo: resultado.periodo,
    resumo: {
      faturamento: resultado.resumo.faturamento,
      itens_vendidos: resultado.resumo.itensVendidos,
      pedidos_cross_sell: resultado.resumo.pedidosCrossSell,
      ticket_medio: resultado.resumo.ticketMedio,
    },
    por_dia: resultado.porDia,
    top_produtos: resultado.topProdutos,
    itens: resultado.itens.map((i) => ({ codigo: i.codigo, cliente: i.cliente, produto_nome: i.produtoNome ?? "", quantidade: i.quantidade, preco: i.preco, subtotal: i.subtotal, criado_em: i.criadoEm ?? "" })),
  };
}
