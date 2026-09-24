import { NextResponse } from "next/server";
import { registrarEventoLoja } from "@/db/queries/lojaTracking";

const TIPOS = ["visita", "view_item", "carrinho", "pedido"];

/** Registra eventos do funil de conversao do dashboard (visita/view_item/carrinho/pedido). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const b = (body ?? {}) as Record<string, unknown>;
  if (!b.loja_id || typeof b.tipo !== "string" || !TIPOS.includes(b.tipo)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await registrarEventoLoja(Number(b.loja_id), b.tipo, typeof b.visitante === "string" ? b.visitante : "");
  } catch {
    /* tracking nunca pode atrapalhar o cliente */
  }
  return NextResponse.json({ ok: true });
}
