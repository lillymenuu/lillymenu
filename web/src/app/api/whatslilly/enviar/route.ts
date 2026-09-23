import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { enviarMensagem } from "@/db/queries/whatsLilly";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const conversaId = Number(body?.conversa_id ?? 0);
  const mensagem = typeof body?.mensagem === "string" ? body.mensagem : "";

  const resultado = await enviarMensagem(sessao.lojaId, conversaId, mensagem);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({ ok: true, enviado: resultado.enviado, erro: resultado.erro, id: resultado.id, hora: resultado.hora, data_fmt: resultado.dataFmt });
}
