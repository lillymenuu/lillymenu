import { phpApiFetch } from "@/lib/phpApi";

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

export function getCrossSellReport(params: CrossSellReportParams = {}) {
  const qs = new URLSearchParams();
  if (params.periodo) qs.set("periodo", params.periodo);
  if (params.data_ini) qs.set("data_ini", params.data_ini);
  if (params.data_fim) qs.set("data_fim", params.data_fim);
  const query = qs.toString();
  return phpApiFetch<CrossSellReportResposta>(
    `/admin/api/v1/relatorio_cross_sell.php${query ? `?${query}` : ""}`
  );
}
