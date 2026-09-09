import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/authCookie";

const PROTECTED_PREFIXES = ["/avaliacoes", "/dashboard"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: ["/avaliacoes/:path*", "/dashboard/:path*"],
};
