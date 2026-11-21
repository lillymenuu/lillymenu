import { NextResponse } from "next/server";
import { verificarCredenciaisGarcom, criarSessaoGarcom } from "@/db/queries/garcomAuth";
import { GARCOM_TOKEN_COOKIE } from "@/lib/garcomAuthCookie";
import { lojaPublicaBloqueada } from "@/db/queries/assinatura";
import { limitar } from "@/lib/limiteTentativas";

/* Equivalente de public/api/garcom_login.php. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const lojaId = Number(body?.loja_id ?? 0);
  const email = String(body?.email ?? "");
  const codigo = String(body?.codigo ?? "");

  /* Codigo de acesso tem 5 caracteres: sem limite, dava pra testar todos. */
  const bloqueio = await limitar(request, "garcom-login", { max: 20, janelaSegundos: 900 }, { valor: `${lojaId}:${email}`, max: 10, janelaSegundos: 900 });
  if (bloqueio) return bloqueio;

  if (!email.trim() || !codigo.trim() || lojaId <= 0) {
    return NextResponse.json({ ok: false, msg: "Informe o e-mail e o código de acesso." }, { status: 400 });
  }

  if (await lojaPublicaBloqueada(lojaId)) {
    return NextResponse.json({ ok: false, msg: "Esta loja não está disponível no momento." }, { status: 403 });
  }

  const garcom = await verificarCredenciaisGarcom(lojaId, email, codigo);
  if (!garcom) return NextResponse.json({ ok: false, msg: "E-mail ou código inválido." }, { status: 401 });

  const token = await criarSessaoGarcom(garcom.id, lojaId);
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(GARCOM_TOKEN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return resposta;
}
