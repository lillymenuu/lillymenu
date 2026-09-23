import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revogarSessao } from "@/db/queries/auth";
import { TOKEN_COOKIE } from "@/lib/authCookie";

export async function POST() {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;

  if (token) {
    await revogarSessao(token);
  }

  store.delete(TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
