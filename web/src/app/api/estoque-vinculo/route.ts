import { NextRequest, NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

function erroResposta(e: unknown) {
  const status = e instanceof PhpApiError ? e.status : 500;
  const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
  return NextResponse.json({ ok: false, msg: erro }, { status });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const produtoId = params.get("produto_id") ?? "";
  const search = params.get("search") ?? "";
  try {
    const data = await phpApiFetch(
      `/admin/api/v1/estoque_vinculo.php?produto_id=${encodeURIComponent(produtoId)}&search=${encodeURIComponent(search)}`
    );
    return NextResponse.json(data);
  } catch (e) {
    return erroResposta(e);
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  try {
    const data = await phpApiFetch("/admin/api/v1/estoque_vinculo.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return NextResponse.json(data);
  } catch (e) {
    return erroResposta(e);
  }
}
