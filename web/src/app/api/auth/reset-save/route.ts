import { NextResponse } from "next/server";
import { salvarNovaSenha } from "@/db/queries/resetSenha";
import { limitar } from "@/lib/limiteTentativas";

export async function POST(request: Request) {
  const bloqueio = await limitar(request, "auth-reset-save", { max: 10, janelaSegundos: 900 });
  if (bloqueio) return bloqueio;

  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "");
  const senha = String(body?.senha ?? "");

  const resultado = await salvarNovaSenha(token, senha);
  if (!resultado.ok) return NextResponse.json(resultado, { status: 400 });

  return NextResponse.json({ ok: true });
}
