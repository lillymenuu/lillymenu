import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { criarSessao } from "@/db/queries/auth";
import { loginComGoogle } from "@/db/queries/googleAuth";
import { googleRedirectUri } from "@/lib/googleOauth";
import { TOKEN_COOKIE } from "@/lib/authCookie";

function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const voltar = (erro: string) => {
    const r = NextResponse.redirect(new URL(`/login?erro=${erro}`, url));
    r.cookies.delete("lm_google_state");
    return r;
  };

  const cookieState = request.headers.get("cookie")?.match(/(?:^|;\s*)lm_google_state=([^;]+)/)?.[1] ?? "";
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const clientId = (process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET ?? "").trim();

  if (!clientId || !clientSecret || !code || !state || !cookieState || !iguais(state, cookieState)) return voltar("google_falha");

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: googleRedirectUri(request), grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  const token = tokenResp?.ok ? ((await tokenResp.json().catch(() => null)) as { access_token?: string } | null) : null;
  if (!token?.access_token) return voltar("google_falha");

  const perfilResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(15000) }).catch(() => null);
  const perfil = perfilResp?.ok ? ((await perfilResp.json().catch(() => null)) as { email?: string; sub?: string; email_verified?: boolean } | null) : null;
  const email = (perfil?.email ?? "").trim();
  const googleId = (perfil?.sub ?? "").trim();
  if (!email || !googleId || !perfil?.email_verified) return voltar("google_falha");

  const resultado = await loginComGoogle(email, googleId);
  if (!resultado.ok) return voltar(resultado.erro);

  const sessao = await criarSessao(resultado.admin.id, resultado.admin.lojaId);
  const resposta = NextResponse.redirect(new URL("/dashboard", url));
  resposta.cookies.delete("lm_google_state");
  resposta.cookies.set(TOKEN_COOKIE, sessao, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return resposta;
}
