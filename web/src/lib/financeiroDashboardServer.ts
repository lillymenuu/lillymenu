import { phpApiFetch } from "@/lib/phpApi";
import type { FinanceiroDashboardResposta } from "@/lib/financeiroDashboard";

export function getFinanceiroDashboard(mes?: number, ano?: number) {
  const params = new URLSearchParams();
  if (mes) params.set("mes", String(mes));
  if (ano) params.set("ano", String(ano));
  const qs = params.toString();
  return phpApiFetch<FinanceiroDashboardResposta>(`/admin/api/v1/financeiro_dashboard_detalhe.php${qs ? `?${qs}` : ""}`);
}
