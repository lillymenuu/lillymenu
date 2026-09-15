import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";
import type { WlMensagensResposta } from "@/lib/whatslilly";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversaId = searchParams.get("conversa_id") ?? "";
  try {
    const data = await phpApiFetch<WlMensagensResposta>(`/admin/api/v1/whatslilly_mensagens.php?conversa_id=${encodeURIComponent(conversaId)}`);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg: erro }, { status });
  }
}
