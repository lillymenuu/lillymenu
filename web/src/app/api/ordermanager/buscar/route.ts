import { NextRequest, NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

function erroResposta(e: unknown) {
  const status = e instanceof PhpApiError ? e.status : 500;
  const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
  return NextResponse.json({ ok: false, msg: erro }, { status });
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const data = await phpApiFetch(`/admin/api/v1/pedidos_buscar.php?q=${encodeURIComponent(q)}`);
    return NextResponse.json(data);
  } catch (e) {
    return erroResposta(e);
  }
}
