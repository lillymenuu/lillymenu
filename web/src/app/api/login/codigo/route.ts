import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verificarCodigoAcesso, criarSessao } from "@/db/queries/auth";
import { TOKEN_COOKIE } from "@/lib/authCookie";
import { limitar } from "@/lib/limiteTentativas";

/** Login pelo codigo de acesso rapido (5 caracteres). Body: { codigo }. */
export async function POST(request: Request) {
  /* Codigo curto: limite mais apertado que o do login por senha (10 tentativas por IP a cada 15 min). */
  const bloqueio = await limitar(request, "login-codigo", { max: 10, janelaSegundos: 900 });
  if (bloqueio) return bloqueio;

  const body = await request.json().catch(() => null);
  const codigo = typeof body?.codigo === "string" ? body.codigo : "";

  const admin = await verificarCodigoAcesso(codigo);
  if (!admin) {
    return NextResponse.json({ ok: false, erro: "Código inválido. Confira e tente de novo." }, { status: 401 });
  }
  if (!admin.ativo) {
    return NextResponse.json({ ok: false, erro: "Usuário inativo. Fale com o administrador da loja." }, { status: 403 });
  }

  const token = await criarSessao(admin.id, admin.lojaId);
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  /* Mesmo retorno do /api/login (assinaturaBloqueada manda pra /plan-details). */
  return NextResponse.json({
    ok: true,
    admin: { id: admin.id, nome: admin.nome, email: admin.email, perfil: admin.perfil },
    assinaturaBloqueada: !admin.lojaAtiva,
  });
}
