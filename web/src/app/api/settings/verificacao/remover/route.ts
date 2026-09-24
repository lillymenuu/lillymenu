import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { removerVerificacao } from "@/db/queries/verificacaoTelefone";

export async function POST() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const resultado = await removerVerificacao(sessao.lojaId);
  return NextResponse.json(resultado);
}
