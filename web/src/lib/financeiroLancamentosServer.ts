import { phpApiFetch } from "@/lib/phpApi";
import type { FinanceiroLancamentosResposta } from "@/lib/financeiroLancamentos";

export function getFinanceiroLancamentos(params?: {
  mes?: number;
  ano?: number;
  tipo?: string;
  categoria_id?: number;
  conta_id?: number;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.mes) qs.set("mes", String(params.mes));
  if (params?.ano) qs.set("ano", String(params.ano));
  if (params?.tipo) qs.set("tipo", params.tipo);
  if (params?.categoria_id) qs.set("categoria_id", String(params.categoria_id));
  if (params?.conta_id) qs.set("conta_id", String(params.conta_id));
  if (params?.page) qs.set("page", String(params.page));
  const query = qs.toString();
  return phpApiFetch<FinanceiroLancamentosResposta>(`/admin/api/v1/financeiro_lancamentos_detalhe.php${query ? `?${query}` : ""}`);
}
