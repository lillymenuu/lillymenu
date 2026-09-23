import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { mensagensLoja } from "@/db/queries/suporteChat";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const afterId = Number(request.nextUrl.searchParams.get("after_id") ?? "0");
  const resultado = await mensagensLoja(sessao.lojaId, afterId);
  if (!resultado.ok) return NextResponse.json({ ok: false, msg: resultado.erro });

  return NextResponse.json({
    ok: true,
    mensagens: resultado.mensagens.map((m) => ({ id: m.id, remetente: m.remetente, mensagem: m.mensagem, anexo_arquivo: m.anexoArquivo, criado_em: m.criadoEm })),
  });
}
