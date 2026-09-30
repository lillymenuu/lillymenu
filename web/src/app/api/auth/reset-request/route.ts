import { NextResponse } from "next/server";
import { solicitarResetSenha } from "@/db/queries/resetSenha";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim();

  if (email === "") return NextResponse.json({ ok: false, msg: "Informe um e-mail válido." }, { status: 400 });

  await solicitarResetSenha(email);

  /* Sempre ok, exista ou nao o e-mail — evita que alguem descubra quais
     e-mails estao cadastrados no sistema por tentativa e erro. */
  return NextResponse.json({ ok: true });
}
