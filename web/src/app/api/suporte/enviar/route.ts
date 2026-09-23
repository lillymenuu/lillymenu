import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { enviarMensagemLoja } from "@/db/queries/suporteChat";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const mensagem = typeof body?.mensagem === "string" ? body.mensagem : "";
  const base64 = typeof body?.imagem_base64 === "string" ? body.imagem_base64 : "";
  const ext = typeof body?.imagem_ext === "string" ? body.imagem_ext : "";

  const resultado = await enviarMensagemLoja(sessao.lojaId, mensagem, base64, ext);
  if (!resultado.ok) return NextResponse.json(resultado);

  const m = resultado.mensagem;
  return NextResponse.json({ ok: true, mensagem: { id: m.id, remetente: m.remetente, mensagem: m.mensagem, anexo_arquivo: m.anexoArquivo, criado_em: m.criadoEm } });
}
