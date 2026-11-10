import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarItensParaTv } from "@/db/queries/midiaIndoor";

/* Produtos e combos por categoria, pra escolher um a um o que aparece na TV. */
export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return NextResponse.json({ ok: true, categorias: await listarItensParaTv(sessao.lojaId, `${proto}://${host}`) });
}
