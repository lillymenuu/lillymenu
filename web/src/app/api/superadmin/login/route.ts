import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verificarCredenciaisSuperadmin, criarSessao } from "@/db/queries/auth";
import { SA_TOKEN_COOKIE } from "@/lib/superAuthCookie";
import { limitar } from "@/lib/limiteTentativas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const senha = typeof body?.senha === "string" ? body.senha : "";

  /* Painel do superadmin: limite mais rigido (10 por IP, 5 por e-mail a cada 15 minutos). */
  const bloqueio = await limitar(request, "superadmin-login", { max: 10, janelaSegundos: 900 }, { valor: email, max: 5, janelaSegundos: 900 });
  if (bloqueio) return bloqueio;

  if (!email || !senha) {
    return NextResponse.json({ ok: false, erro: "Informe email e senha." }, { status: 422 });
  }

  const admin = await verificarCredenciaisSuperadmin(email, senha);
  if (!admin) {
    return NextResponse.json({ ok: false, erro: "Email ou senha invalidos." }, { status: 401 });
  }

  const token = await criarSessao(admin.id, admin.lojaId);

  const store = await cookies();
  store.set(SA_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
