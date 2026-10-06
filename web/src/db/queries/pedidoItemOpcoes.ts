import "server-only";
import type { NeonTx } from "@/db";
import { pedidoItemOpcoes } from "@/db/schema";

/*
 * Persiste a selecao de variacao/grupos de opcoes de um item de pedido — chamado
 * logo apos o insert em pedido_itens, tanto pela loja (pedidoCriar.ts) quanto pelo
 * PDV (pdvSalvar.ts). Sem isso, reabrir o pedido pra editar nao tem como vir com as
 * opcoes do cliente ja marcadas (so existe o nome "achatado" em produto_nome).
 */
export async function registrarItemOpcoes(
  tx: NeonTx,
  pedidoItemId: number,
  variacaoId: number | null | undefined,
  selecoesGrupos: Record<number, number[]> | null | undefined,
  lojaId: number
): Promise<void> {
  const linhas: (typeof pedidoItemOpcoes.$inferInsert)[] = [];

  if (variacaoId) {
    linhas.push({ pedido_item_id: pedidoItemId, tipo: "variacao", grupo_id: null, referencia_id: variacaoId, loja_id: lojaId });
  }
  if (selecoesGrupos) {
    for (const [grupoIdStr, itemIds] of Object.entries(selecoesGrupos)) {
      const grupoId = Number(grupoIdStr);
      for (const itemId of itemIds) {
        if (itemId > 0) linhas.push({ pedido_item_id: pedidoItemId, tipo: "grupo", grupo_id: grupoId, referencia_id: itemId, loja_id: lojaId });
      }
    }
  }

  if (linhas.length > 0) await tx.insert(pedidoItemOpcoes).values(linhas);
}
