import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { phpApiBaseUrl } from "@/lib/phpApi";
import { TOKEN_COOKIE } from "@/lib/authCookie";

export async function POST() {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;

  if (token) {
    await fetch(`${phpApiBaseUrl()}/admin/api/v1/auth_logout.php`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);
  }

  store.delete(TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
