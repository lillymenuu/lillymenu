import { phpApiFetch } from "@/lib/phpApi";
import type { FinanceiroCategoriasResposta } from "@/lib/financeiroCategorias";

export function getFinanceiroCategorias(params?: { tipo?: string }) {
  const qs = new URLSearchParams();
  if (params?.tipo) qs.set("tipo", params.tipo);
  const query = qs.toString();
  return phpApiFetch<FinanceiroCategoriasResposta>(`/admin/api/v1/financeiro_categorias_detalhe.php${query ? `?${query}` : ""}`);
}
