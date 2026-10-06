import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { NeonTx } from "@/db";
import { produtos, produtoVariacoes, produtoOpcoesGrupos, produtoOpcoesItens, pedidoItemOpcoes } from "@/db/schema";

/*
 * Persiste a selecao de variacao/grupos de opcoes de um item de pedido — chamado
 * logo apos o insert em pedido_itens, tanto pela loja (pedidoCriar.ts) quanto pelo
 * PDV (pdvSalvar.ts) e pelo modo garcom (modoGarcom.ts). Sem isso, reabrir o pedido
 * pra editar nao tem como vir com as opcoes do cliente ja marcadas, e o resumo do
 * pedido so tem o nome "achatado" em texto pra mostrar.
 *
 * Titulo/nome sao resolvidos aqui (contra o catalogo AGORA, na hora do pedido) e
 * gravados como snapshot — editar o produto depois (delete-all+reinsert de grupos/
 * itens) nao pode fazer pedidos antigos perderem a composicao.
 */
export async function registrarItemOpcoes(
  tx: NeonTx,
  pedidoItemId: number,
  produtoId: number | null | undefined,
  variacaoId: number | null | undefined,
  selecoesGrupos: Record<number, number[]> | null | undefined,
  lojaId: number
): Promise<void> {
  const linhas: (typeof pedidoItemOpcoes.$inferInsert)[] = [];

  if (variacaoId && produtoId) {
    const [v] = await tx
      .select({ tamanho: produtoVariacoes.tamanho, cor: produtoVariacoes.cor })
      .from(produtoVariacoes)
      .where(and(eq(produtoVariacoes.id, variacaoId), eq(produtoVariacoes.loja_id, lojaId)))
      .limit(1);
    if (v) {
      const [p] = await tx.select({ variacoesTitulo: produtos.variacoes_titulo }).from(produtos).where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId))).limit(1);
      const nome = [v.tamanho, v.cor].filter(Boolean).join(" - ") || "Variação";
      linhas.push({ pedido_item_id: pedidoItemId, tipo: "variacao", grupo_id: null, referencia_id: variacaoId, titulo: p?.variacoesTitulo?.trim() || "Variações do produto", nome, loja_id: lojaId });
    }
  }

  if (selecoesGrupos) {
    const grupoIds = Object.keys(selecoesGrupos).map(Number).filter((id) => id > 0);
    const itemIds = Object.values(selecoesGrupos).flat().filter((id) => id > 0);
    if (grupoIds.length > 0 && itemIds.length > 0) {
      const [grupos, itens] = await Promise.all([
        tx.select({ id: produtoOpcoesGrupos.id, titulo: produtoOpcoesGrupos.titulo }).from(produtoOpcoesGrupos).where(and(inArray(produtoOpcoesGrupos.id, grupoIds), eq(produtoOpcoesGrupos.loja_id, lojaId))),
        tx.select({ id: produtoOpcoesItens.id, nome: produtoOpcoesItens.nome }).from(produtoOpcoesItens).where(and(inArray(produtoOpcoesItens.id, itemIds), eq(produtoOpcoesItens.loja_id, lojaId))),
      ]);
      for (const [grupoIdStr, ids] of Object.entries(selecoesGrupos)) {
        const grupoId = Number(grupoIdStr);
        const grupo = grupos.find((g) => g.id === grupoId);
        if (!grupo) continue;
        for (const itemId of ids) {
          const item = itens.find((it) => it.id === itemId);
          if (!item) continue;
          linhas.push({ pedido_item_id: pedidoItemId, tipo: "grupo", grupo_id: grupoId, referencia_id: itemId, titulo: grupo.titulo, nome: item.nome, loja_id: lojaId });
        }
      }
    }
  }

  if (linhas.length > 0) await tx.insert(pedidoItemOpcoes).values(linhas);
}
