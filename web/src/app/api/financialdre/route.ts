import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";
import type { FinanceiroDreResposta } from "@/lib/financeiroDre";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const ano = searchParams.get("ano");
  if (ano) qs.set("ano", ano);
  const query = qs.toString();

  try {
    const data = await phpApiFetch<FinanceiroDreResposta>(`/admin/api/v1/financeiro_dre_detalhe.php${query ? `?${query}` : ""}`);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg: erro }, { status });
  }
}
