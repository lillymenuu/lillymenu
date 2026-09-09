import { NextRequest, NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

function erroResposta(e: unknown) {
  const status = e instanceof PhpApiError ? e.status : 500;
  const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
  return NextResponse.json({ ok: false, msg: erro }, { status });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  try {
    const data = await phpApiFetch(`/admin/api/v1/cliente_stats.php?cliente_id=${encodeURIComponent(id)}`);
    return NextResponse.json(data);
  } catch (e) {
    return erroResposta(e);
  }
}
