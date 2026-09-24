import "server-only";
import { db } from "@/db";
import { lojaEventos } from "@/db/schema";

/* Equivalente de public/api/loja_tracking.php: eventos do funil de conversao (visita/view_item/carrinho/pedido). */

const TIPOS_VALIDOS = ["visita", "view_item", "carrinho", "pedido"] as const;

export async function registrarEventoLoja(lojaId: number, tipo: string, visitanteInput: string): Promise<{ ok: boolean }> {
  if (!TIPOS_VALIDOS.includes(tipo as (typeof TIPOS_VALIDOS)[number])) return { ok: false };

  const visitante = visitanteInput.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  await db.insert(lojaEventos).values({ loja_id: lojaId, tipo, visitante: visitante !== "" ? visitante : null });

  return { ok: true };
}
