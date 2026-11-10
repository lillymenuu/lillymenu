import { NextResponse } from "next/server";
import { catalogoDaTv } from "@/db/queries/midiaIndoor";
import { HEADER_TOKEN_TV } from "@/lib/midiaIndoor";

/* Catalogo exibido no player da TV. Autenticado so pelo token da TV (somente leitura). */
export async function GET(request: Request) {
  const token = request.headers.get(HEADER_TOKEN_TV) ?? "";
  if (!token) return NextResponse.json({ ok: false, motivo: "tv_removida" }, { status: 401 });

  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const resultado = await catalogoDaTv(token, `${proto}://${host}/`);

  if (!resultado.ok) return NextResponse.json(resultado, { status: resultado.motivo === "tv_removida" ? 401 : 403 });
  return NextResponse.json(resultado, { headers: { "Cache-Control": "no-store" } });
}
