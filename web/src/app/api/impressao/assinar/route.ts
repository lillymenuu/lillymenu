import { NextRequest, NextResponse } from "next/server";
import { createSign } from "node:crypto";
import { getSessaoAdmin } from "@/lib/session";

/*
 * Assina (RSA-SHA512) as mensagens que o QZ Tray pede — par do certificado em
 * /api/impressao/certificado. A chave privada fica so no servidor
 * (QZ_PRIVATE_KEY); sem ela, responde vazio e o QZ cai no modo anonimo.
 */
export async function POST(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return new NextResponse("", { status: 401 });

  const chave = (process.env.QZ_PRIVATE_KEY ?? "").replace(/\n/g, "\n").trim();
  if (!chave) return new NextResponse("", { headers: { "Content-Type": "text/plain" } });

  const { mensagem } = (await request.json().catch(() => ({}))) as { mensagem?: string };
  if (typeof mensagem !== "string" || !mensagem) return new NextResponse("", { status: 400 });

  const assinatura = createSign("SHA512").update(mensagem).sign(chave, "base64");
  return new NextResponse(assinatura, { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
}
