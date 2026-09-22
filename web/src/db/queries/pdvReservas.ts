import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { pdvReservas } from "@/db/schema";

/*
 * Equivalente de admin/helpers/pdv_reserva_module.php (pdvReservaMapa/Aplicar):
 * unidades que o balcao (PDV) ja separou no carrinho, ainda dentro do TTL de
 * 90s, precisam sair do estoque exibido/checado na loja publica.
 */
const TTL_MS = 90_000;

export async function reservaMapaPdv(lojaId: number): Promise<Map<number, number>> {
  const limite = new Date(Date.now() - TTL_MS).toISOString();
  const linhas = await db
    .select({ produtoId: pdvReservas.produto_id, qtd: pdvReservas.quantidade })
    .from(pdvReservas)
    .where(and(eq(pdvReservas.loja_id, lojaId), gte(pdvReservas.atualizado_em, limite)));

  const mapa = new Map<number, number>();
  for (const l of linhas) {
    mapa.set(l.produtoId, (mapa.get(l.produtoId) ?? 0) + l.qtd);
  }
  return mapa;
}

export function aplicarReservaPdv(estoque: number, produtoId: number, mapa: Map<number, number>): number {
  return Math.max(0, estoque - (mapa.get(produtoId) ?? 0));
}
