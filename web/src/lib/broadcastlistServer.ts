import "server-only";
import { listarListas } from "@/db/queries/broadcastList";
import type { BlListarResposta } from "@/lib/broadcastlist";

export async function getBlListas(lojaId: number): Promise<BlListarResposta> {
  const listas = await listarListas(lojaId);
  return { ok: true, listas: listas.map((l) => ({ id: l.id, nome: l.nome, criado_em: l.criadoEm, total_membros: l.totalMembros })) };
}
