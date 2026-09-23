import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revogarSessao } from "@/db/queries/auth";
import { SA_TOKEN_COOKIE } from "@/lib/superAuthCookie";

export async function POST() {
  const store = await cookies();
  const token = store.get(SA_TOKEN_COOKIE)?.value;

  if (token) {
    await revogarSessao(token);
  }

  store.delete(SA_TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
