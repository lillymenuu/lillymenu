import { NextResponse } from "next/server";
import { salvarNovaSenha } from "@/db/queries/resetSenha";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "");
  const senha = String(body?.senha ?? "");

  const resultado = await salvarNovaSenha(token, senha);
  if (!resultado.ok) return NextResponse.json(resultado, { status: 400 });

  return NextResponse.json({ ok: true });
}
