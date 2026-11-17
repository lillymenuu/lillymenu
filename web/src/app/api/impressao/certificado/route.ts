import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";

/*
 * Certificado publico usado pelo QZ Tray pra confiar no site (sem ele, o QZ
 * mostra o aviso "Untrusted website / Allow" a cada conexao). Opcional:
 * sem QZ_CERTIFICATE configurado, responde vazio e a impressao segue em modo
 * anonimo. O mesmo certificado precisa estar instalado no QZ Tray de cada
 * computador (arquivo override.crt na pasta do QZ Tray).
 */
export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return new NextResponse("", { status: 401 });
  const cert = (process.env.QZ_CERTIFICATE ?? "").replace(/\\n/g, "\n").trim();
  return new NextResponse(cert, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
