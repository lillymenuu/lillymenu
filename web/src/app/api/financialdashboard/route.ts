import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";
import type { FinanceiroDashboardResposta } from "@/lib/financeiroDashboard";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes");
  const ano = searchParams.get("ano");
  const params = new URLSearchParams();
  if (mes) params.set("mes", mes);
  if (ano) params.set("ano", ano);
  const qs = params.toString();

  try {
    const data = await phpApiFetch<FinanceiroDashboardResposta>(
      `/admin/api/v1/financeiro_dashboard_detalhe.php${qs ? `?${qs}` : ""}`
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg: erro }, { status });
  }
}
