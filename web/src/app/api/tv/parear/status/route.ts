import { NextResponse } from "next/server";
import { statusPareamento } from "@/db/queries/midiaIndoor";
import { limparCodigoPareamento } from "@/lib/midiaIndoor";

/* A TV consulta a cada 2 s ate o admin confirmar pelo celular; ai recebe o token fixo dela. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const codigo = limparCodigoPareamento(url.searchParams.get("codigo") ?? "");
  const segredo = url.searchParams.get("segredo") ?? "";
  if (!codigo || !segredo) return NextResponse.json({ ok: false, status: "expirado" }, { status: 400 });
  const resultado = await statusPareamento(codigo, segredo);
  return NextResponse.json({ ok: true, ...resultado });
}
