import { NextResponse } from "next/server";
import { solicitarResetSenha } from "@/db/queries/resetSenha";
import { limitar } from "@/lib/limiteTentativas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim();

  if (email === "") return NextResponse.json({ ok: false, msg: "Informe um e-mail válido." }, { status: 400 });

  /* Evita usar o sistema pra disparar e-mails em massa: 5 pedidos por IP e 3 por e-mail por hora. */
  const bloqueio = await limitar(request, "reset-request", { max: 5, janelaSegundos: 3600 }, { valor: email, max: 3, janelaSegundos: 3600 });
  if (bloqueio) return bloqueio;

  await solicitarResetSenha(email);

  /* Sempre ok, exista ou nao o e-mail — evita que alguem descubra quais
     e-mails estao cadastrados no sistema por tentativa e erro. */
  return NextResponse.json({ ok: true });
}
