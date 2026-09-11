import { phpApiFetch } from "@/lib/phpApi";

export type MotoboyGerenciar = {
  id: number;
  nome: string;
  whatsapp: string;
  data_cadastro: string;
  ativo: number;
  entregas_periodo: number;
  taxas_periodo: number;
};

export type MotoboysGerenciarResposta = {
  ok: true;
  periodo: string;
  data_inicio: string;
  data_fim: string;
  stats: {
    total_motoboys: number;
    entregas_periodo: number;
    taxas_periodo: number;
  };
  motoboys: MotoboyGerenciar[];
};

export type MotoboyEntrega = {
  id: number;
  codigo: number;
  status: string;
  criado_em: string;
  endereco_entrega: string;
  taxa_entrega: number;
  cliente_nome: string;
  cliente_telefone: string;
  motoboy_nome: string;
  motoboy_whatsapp: string;
};

export type MotoboysEntregasResposta = {
  ok: true;
  entregas: MotoboyEntrega[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  mostrando_de: number;
  mostrando_ate: number;
};

export type MotoboysPeriodoParams = {
  periodo?: string;
  data_inicio?: string;
  data_fim?: string;
};

export function getMotoboysGerenciar(params: MotoboysPeriodoParams = {}) {
  const qs = new URLSearchParams();
  if (params.periodo) qs.set("periodo", params.periodo);
  if (params.data_inicio) qs.set("data_inicio", params.data_inicio);
  if (params.data_fim) qs.set("data_fim", params.data_fim);
  const query = qs.toString();
  return phpApiFetch<MotoboysGerenciarResposta>(
    `/admin/api/v1/motoboys_gerenciar.php${query ? `?${query}` : ""}`
  );
}
