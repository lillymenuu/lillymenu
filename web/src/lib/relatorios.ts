import { phpApiFetch } from "@/lib/phpApi";

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

export function getRelatorios(params: RelatoriosParams = {}) {
  const qs = new URLSearchParams();
  if (params.periodo) qs.set("periodo", params.periodo);
  if (params.data_ini) qs.set("data_ini", params.data_ini);
  if (params.data_fim) qs.set("data_fim", params.data_fim);
  if (params.tipo) qs.set("tipo", params.tipo);
  if (params.pagina) qs.set("pagina", String(params.pagina));
  if (params.limite) qs.set("limite", String(params.limite));
  const query = qs.toString();
  return phpApiFetch<RelatoriosResposta>(`/admin/api/v1/relatorios.php${query ? `?${query}` : ""}`);
}
