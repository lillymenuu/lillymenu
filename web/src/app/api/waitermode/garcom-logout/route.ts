import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revogarSessaoGarcom } from "@/db/queries/garcomAuth";
import { GARCOM_TOKEN_COOKIE } from "@/lib/garcomAuthCookie";

/* Equivalente de public/api/garcom_logout.php. */
export async function POST() {
  const store = await cookies();
  const token = store.get(GARCOM_TOKEN_COOKIE)?.value;
  if (token) await revogarSessaoGarcom(token);

  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.delete(GARCOM_TOKEN_COOKIE);
  return resposta;
}
