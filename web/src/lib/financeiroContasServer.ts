import { phpApiFetch } from "@/lib/phpApi";
import type { FinanceiroContasResposta } from "@/lib/financeiroContas";

export function getFinanceiroContas() {
  return phpApiFetch<FinanceiroContasResposta>("/admin/api/v1/financeiro_contas_detalhe.php");
}
