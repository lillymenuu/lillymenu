import { NextResponse } from "next/server";
import { verificarCredenciaisGarcom, criarSessaoGarcom } from "@/db/queries/garcomAuth";
import { GARCOM_TOKEN_COOKIE } from "@/lib/garcomAuthCookie";

/* Equivalente de public/api/garcom_login.php. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const lojaId = Number(body?.loja_id ?? 0);
  const email = String(body?.email ?? "");
  const codigo = String(body?.codigo ?? "");

  if (!email.trim() || !codigo.trim() || lojaId <= 0) {
    return NextResponse.json({ ok: false, msg: "Informe o e-mail e o código de acesso." }, { status: 400 });
  }

  const garcom = await verificarCredenciaisGarcom(lojaId, email, codigo);
  if (!garcom) return NextResponse.json({ ok: false, msg: "E-mail ou código inválido." }, { status: 401 });

  const token = await criarSessaoGarcom(garcom.id, lojaId);
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(GARCOM_TOKEN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return resposta;
}
