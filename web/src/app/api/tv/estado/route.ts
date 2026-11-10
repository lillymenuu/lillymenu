import { NextResponse } from "next/server";
import { estadoDaTv } from "@/db/queries/midiaIndoor";
import { HEADER_TOKEN_TV } from "@/lib/midiaIndoor";

/*
 * Consultado pela TV a cada 5 s. "versao": muda quando o Admin altera a TV (configurar, parar,
 * retomar). "build": muda a cada nova publicacao do sistema; a TV recarrega a pagina sozinha pra
 * nao ficar rodando uma versao antiga do player por dias.
 */
const BUILD = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

export async function GET(request: Request) {
  const token = request.headers.get(HEADER_TOKEN_TV) ?? "";
  const estado = token ? await estadoDaTv(token) : null;
  if (!estado) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, versao: estado.versao, build: BUILD }, { headers: { "Cache-Control": "no-store" } });
}
