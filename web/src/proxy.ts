import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/authCookie";
import { SA_TOKEN_COOKIE } from "@/lib/superAuthCookie";

const PROTECTED_PREFIXES = ["/avaliacoes", "/dashboard", "/produtos"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/avaliacoes/:path*", "/dashboard/:path*", "/produtos/:path*", "/superadmin/:path*"],
};
