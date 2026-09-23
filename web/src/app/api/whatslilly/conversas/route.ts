import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarConversas } from "@/db/queries/whatsLilly";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const busca = searchParams.get("busca") ?? "";

  const { conversas, totalNaoLidas } = await listarConversas(sessao.lojaId, busca);
  return NextResponse.json({
    ok: true,
    conversas: conversas.map((c) => ({ id: c.id, numero: c.numero, nome: c.nome, ultimo_msg: c.ultimoMsg, ultimo_msg_em: c.ultimoMsgEm, nao_lidas: c.naoLidas })),
    total_nao_lidas: totalNaoLidas,
  });
}
