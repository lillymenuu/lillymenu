import { phpApiFetch } from "@/lib/phpApi";
import type { FinanceiroDreResposta } from "@/lib/financeiroDre";

export function getFinanceiroDre(ano?: number) {
  const qs = new URLSearchParams();
  if (ano) qs.set("ano", String(ano));
  const query = qs.toString();
  return phpApiFetch<FinanceiroDreResposta>(`/admin/api/v1/financeiro_dre_detalhe.php${query ? `?${query}` : ""}`);
}
