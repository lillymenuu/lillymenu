import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";
import type { FinanceiroLancamentosResposta } from "@/lib/financeiroLancamentos";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  for (const key of ["mes", "ano", "tipo", "categoria_id", "conta_id", "page"]) {
    const v = searchParams.get(key);
    if (v) qs.set(key, v);
  }
  const query = qs.toString();

  try {
    const data = await phpApiFetch<FinanceiroLancamentosResposta>(
      `/admin/api/v1/financeiro_lancamentos_detalhe.php${query ? `?${query}` : ""}`
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg: erro }, { status });
  }
}
