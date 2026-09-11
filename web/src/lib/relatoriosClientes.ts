import { phpApiFetch } from "@/lib/phpApi";

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

export function getRelatoriosClientes(params: RelatoriosClientesParams = {}) {
  const qs = new URLSearchParams();
  if (params.busca) qs.set("busca", params.busca);
  if (params.ordenar) qs.set("ordenar", params.ordenar);
  if (params.periodo) qs.set("periodo", params.periodo);
  if (params.data_ini) qs.set("data_ini", params.data_ini);
  if (params.data_fim) qs.set("data_fim", params.data_fim);
  if (params.pagina) qs.set("pagina", String(params.pagina));
  if (params.limite) qs.set("limite", String(params.limite));
  const query = qs.toString();
  return phpApiFetch<RelatoriosClientesResposta>(
    `/admin/api/v1/relatorios_clientes.php${query ? `?${query}` : ""}`
  );
}
