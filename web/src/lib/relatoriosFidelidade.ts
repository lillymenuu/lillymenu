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
  periodo_dias: number;
  cashback_saldo_base: number;
  cashback_utilizado: number;
  pedidos_com_cashback: number;
  clientes: ClienteFidelidade[];
  historico: MovimentoFidelidade[];
  cupom_desconto: number;
  cupom_pedidos: number;
};

export function getRelatoriosFidelidade() {
  return phpApiFetch<RelatoriosFidelidadeResposta>("/admin/api/v1/relatorios_fidelidade.php");
}
