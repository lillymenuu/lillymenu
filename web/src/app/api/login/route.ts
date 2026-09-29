import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verificarCredenciais, criarSessao } from "@/db/queries/auth";
import { TOKEN_COOKIE } from "@/lib/authCookie";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const senha = typeof body?.senha === "string" ? body.senha : "";

  if (!email || !senha) {
    return NextResponse.json(
      { ok: false, erro: "Informe email e senha." },
      { status: 422 }
    );
  }

  const admin = await verificarCredenciais(email, senha);
  if (!admin) {
    return NextResponse.json(
      { ok: false, erro: "Email ou senha invalidos." },
      { status: 401 }
    );
  }

  if (!admin.ativo) {
    return NextResponse.json(
      { ok: false, erro: "Conta ou loja inativa. Acesse pelo painel atual para regularizar." },
      { status: 403 }
    );
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

  /*
   * lojaAtiva=false aqui so acontece por assinatura vencida (bloquearSeAssinaturaExpirada
   * nunca desativa admin.ativo -- ver session.ts/getSessaoAdminParaCobranca). Deixa logar
   * mesmo assim, senao a loja nunca consegue chegar em /plan-details pra pagar o Pix e se
   * desbloquear sozinha. O front usa esse flag pra mandar pra /plan-details em vez do
   * /dashboard normal (que bateria de volta no login pela checagem estrita de sessao).
   */
  return NextResponse.json({
    ok: true,
    admin: { id: admin.id, nome: admin.nome, email: admin.email, perfil: admin.perfil },
    assinaturaBloqueada: !admin.lojaAtiva,
  });
}
