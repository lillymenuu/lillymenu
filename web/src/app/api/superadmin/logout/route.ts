import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { phpApiBaseUrl } from "@/lib/phpApi";
import { SA_TOKEN_COOKIE } from "@/lib/superAuthCookie";

export async function POST() {
  const store = await cookies();
  const token = store.get(SA_TOKEN_COOKIE)?.value;

  if (token) {
    await fetch(`${phpApiBaseUrl()}/admin/api/v1/auth_logout.php`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => {});
  }

  store.delete(SA_TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
