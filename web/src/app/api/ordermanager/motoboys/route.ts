import { NextRequest, NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

function erroResposta(e: unknown) {
  const status = e instanceof PhpApiError ? e.status : 500;
  const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
  return NextResponse.json({ ok: false, msg: erro }, { status });
}

export async function GET(request: NextRequest) {
  const pedidoId = request.nextUrl.searchParams.get("pedido_id") ?? "";
  try {
    const data = await phpApiFetch(
      `/admin/api/v1/motoboys.php?action=list&pedido_id=${encodeURIComponent(pedidoId)}`
    );
    return NextResponse.json(data);
  } catch (e) {
    return erroResposta(e);
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  try {
    const data = await phpApiFetch("/admin/api/v1/motoboys.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return NextResponse.json(data);
  } catch (e) {
    return erroResposta(e);
  }
}
