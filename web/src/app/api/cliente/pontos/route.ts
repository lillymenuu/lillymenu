import { NextRequest, NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

function erroResposta(e: unknown) {
  const status = e instanceof PhpApiError ? e.status : 500;
  const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
  return NextResponse.json({ ok: false, msg: erro }, { status });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = params.get("id") ?? "";
  const pagina = params.get("pagina") ?? "1";
  try {
    const data = await phpApiFetch(
      `/admin/api/v1/cliente_pontos.php?cliente_id=${encodeURIComponent(id)}&pagina=${encodeURIComponent(pagina)}`
    );
    return NextResponse.json(data);
  } catch (e) {
    return erroResposta(e);
  }
}
