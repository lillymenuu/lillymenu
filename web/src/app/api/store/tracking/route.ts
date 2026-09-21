import { NextResponse } from "next/server";
import { storePhpFetch, storeFormBody } from "@/lib/store/api";

const TIPOS = ["visita", "view_item", "carrinho", "pedido"];

/** Proxy pro loja_tracking.php legado (eventos do funil de conversao do dashboard). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const b = (body ?? {}) as Record<string, unknown>;
  if (!b.loja_id || typeof b.tipo !== "string" || !TIPOS.includes(b.tipo)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await storePhpFetch("/public/api/loja_tracking.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: storeFormBody({
        loja_id: b.loja_id as number,
        tipo: b.tipo,
        visitante: typeof b.visitante === "string" ? b.visitante : "",
      }),
    });
  } catch {
    /* tracking nunca pode atrapalhar o cliente */
  }
  return NextResponse.json({ ok: true });
}
