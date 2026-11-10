import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { confirmarPareamento } from "@/db/queries/midiaIndoor";
import { limparCodigoPareamento, TAMANHO_CODIGO } from "@/lib/midiaIndoor";

/* Admin confirma o codigo da TV (lido pelo QR ou digitado na tela Midia Indoor). */
export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const codigo = limparCodigoPareamento(String(body?.codigo ?? ""));
  if (codigo.length !== TAMANHO_CODIGO) return NextResponse.json({ ok: false, msg: "Código inválido." }, { status: 400 });

  return NextResponse.json(await confirmarPareamento(sessao.lojaId, codigo, String(body?.nome ?? "")));
}
