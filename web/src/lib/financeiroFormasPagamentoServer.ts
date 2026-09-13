import { phpApiFetch } from "@/lib/phpApi";
import type { FinanceiroFormasPagamentoResposta } from "@/lib/financeiroFormasPagamento";

export function getFinanceiroFormasPagamento() {
  return phpApiFetch<FinanceiroFormasPagamentoResposta>("/admin/api/v1/financeiro_formas_pagamento_detalhe.php");
}
