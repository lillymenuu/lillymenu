import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { enviarCodigoVerificacao } from "@/db/queries/verificacaoTelefone";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await enviarCodigoVerificacao(sessao.lojaId, String(body.whatsapp ?? ""));
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({ ok: true, enviado: resultado.enviado, instancia_off: resultado.instanciaOff, codigo_manual: resultado.codigoManual, msg_aviso: resultado.msgAviso });
}
