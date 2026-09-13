import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";
import type { FinanceiroCategoriasResposta } from "@/lib/financeiroCategorias";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const tipo = searchParams.get("tipo");
  if (tipo) qs.set("tipo", tipo);
  const query = qs.toString();

  try {
    const data = await phpApiFetch<FinanceiroCategoriasResposta>(
      `/admin/api/v1/financeiro_categorias_detalhe.php${query ? `?${query}` : ""}`
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg: erro }, { status });
  }
}
