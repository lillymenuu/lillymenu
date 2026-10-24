import { NextResponse } from "next/server";
import { solicitarContaMesaPublico } from "@/db/queries/storeCliente";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, msg: "Requisição inválida." }, { status: 400 });

  const b = body as Record<string, unknown>;
  const lojaId = Number(b.loja_id ?? 0);
  const mesaId = Number(b.mesa_id ?? 0);

  const resultado = await solicitarContaMesaPublico(lojaId, mesaId);
  return NextResponse.json(resultado);
}
