import "server-only";
import { listarConversas } from "@/db/queries/whatsLilly";
import type { WlConversasResposta } from "@/lib/whatslilly";

export async function getWlConversas(lojaId: number): Promise<WlConversasResposta> {
  const { conversas, totalNaoLidas } = await listarConversas(lojaId, "");
  return {
    ok: true,
    conversas: conversas.map((c) => ({ id: c.id, numero: c.numero, nome: c.nome, ultimo_msg: c.ultimoMsg, ultimo_msg_em: c.ultimoMsgEm, nao_lidas: c.naoLidas })),
    total_nao_lidas: totalNaoLidas,
  };
}
