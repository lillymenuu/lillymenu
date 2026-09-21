import { NextRequest, NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

export async function GET(request: NextRequest) {
  const afterId = request.nextUrl.searchParams.get("after_id") ?? "0";
  try {
    const data = await phpApiFetch(`/admin/api/v1/suporte_mensagens.php?after_id=${encodeURIComponent(afterId)}`);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const msg = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
