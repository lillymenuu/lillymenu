import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/authCookie";
import { SA_TOKEN_COOKIE } from "@/lib/superAuthCookie";
import { HEADER_ROTA_API } from "@/lib/recursosApi";

const PROTECTED_PREFIXES = ["/avaliacoes", "/dashboard", "/produtos"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* APIs: marca a rota chamada pra getSessaoAdmin() conferir o recurso do plano (ver lib/recursosApi).
     Sempre sobrescreve o header, entao o navegador nao consegue forjar outra rota. */
  if (pathname.startsWith("/api/")) {
    const headers = new Headers(request.headers);
    headers.set(HEADER_ROTA_API, pathname);
    return NextResponse.next({ request: { headers } });
  }

  /* Painel do superadmin: cookie proprio (lm_sa_token), nunca o das lojas. */
  if (pathname.startsWith("/superadmin")) {
    if (pathname === "/superadmin/login" || request.cookies.has(SA_TOKEN_COOKIE)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/superadmin/login", request.url));
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasToken = request.cookies.has(TOKEN_COOKIE);
  if (!hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/avaliacoes/:path*", "/dashboard/:path*", "/produtos/:path*", "/superadmin/:path*"],
};
