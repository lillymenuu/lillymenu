import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { confirmarCodigoVerificacao } from "@/db/queries/verificacaoTelefone";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await confirmarCodigoVerificacao(sessao.lojaId, String(body.codigo ?? ""));
  return NextResponse.json(resultado);
}
