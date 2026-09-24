import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleRedirectUri } from "@/lib/googleOauth";

export async function GET(request: Request) {
  const clientId = (process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const origem = new URL(request.url);
  if (!clientId || !(process.env.GOOGLE_CLIENT_SECRET ?? "").trim()) {
    return NextResponse.redirect(new URL("/login?erro=google_nao_configurado", origem));
  }

  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  const resposta = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  resposta.cookies.set("lm_google_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return resposta;
}
