import { phpApiFetch } from "@/lib/phpApi";

export type ClienteFidelidade = {
  nome: string;
  criado_em: string | null;
  saldo: number;
  usado: number;
  expira_em: string | null;
};

export type MovimentoFidelidade = {
  tipo: string;
  classe: "positivo" | "negativo";
  data: string | null;
  valor: number;
};

export type RelatoriosFidelidadeResposta = {
  ok: true;
  data_ini: string;
  data_fim: string;
  cashback_saldo_base: number;
  cashback_utilizado: number;
  pedidos_com_cashback: number;
  clientes: ClienteFidelidade[];
  historico: MovimentoFidelidade[];
  cupom_desconto: number;
  cupom_pedidos: number;
};

export type RelatoriosFidelidadeParams = {
  periodo?: string;
  data_ini?: string;
  data_fim?: string;
};

export function getRelatoriosFidelidade(params: RelatoriosFidelidadeParams = {}) {
  const qs = new URLSearchParams();
  if (params.periodo) qs.set("periodo", params.periodo);
  if (params.data_ini) qs.set("data_ini", params.data_ini);
  if (params.data_fim) qs.set("data_fim", params.data_fim);
  const query = qs.toString();
  return phpApiFetch<RelatoriosFidelidadeResposta>(
    `/admin/api/v1/relatorios_fidelidade.php${query ? `?${query}` : ""}`
  );
}
