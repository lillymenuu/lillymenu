import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { phpApiBaseUrl } from "@/lib/phpApi";
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

  const res = await fetch(`${phpApiBaseUrl()}/admin/api/v1/auth_login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    return NextResponse.json(
      { ok: false, erro: data?.erro ?? "Falha ao autenticar." },
      { status: res.status || 401 }
    );
  }

  const store = await cookies();
  store.set(TOKEN_COOKIE, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true, admin: data.admin });
}
