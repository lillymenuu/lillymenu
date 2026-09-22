import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { NeonTx } from "@/db";
import { pedidoItens, pedidoComboItens, estoque, estoqueMovimentacoes } from "@/db/schema";
import { sincronizarEstoqueVinculo } from "@/db/queries/estoqueVinculo";

/*
 * Equivalente de admin/helpers/pedido_estoque_module.php
 * (pedidoRestaurarEstoqueCancelado): repoe ao estoque os itens de um
 * pedido cancelado. Usado tanto por pedidosStatus.ts (cancelarPedido)
 * quanto pela troca de status pra 'cancelado' via atualizarStatusPedido
 * — no PHP as duas rotas historicamente divergiam (so uma repunha
 * estoque), centralizado aqui pra nao repetir o erro.
 *
 * Itens de combo salvam o id da tabela "combos" em pedido_itens.produto_id
 * (nao um produto real) — sao pulados na reposicao normal e repostos via
 * os componentes persistidos em pedido_combo_itens (ja gravados na hora
 * da compra por registrarComponentesCombo, em estoqueVinculo.ts).
 */
export async function pedidoRestaurarEstoqueCancelado(tx: NeonTx, pedidoId: number, lojaId: number): Promise<void> {
  const itens = await tx
    .select({ id: pedidoItens.id, produtoId: pedidoItens.produto_id, quantidade: pedidoItens.quantidade })
    .from(pedidoItens)
    .where(and(eq(pedidoItens.pedido_id, pedidoId), eq(pedidoItens.loja_id, lojaId)));

  const itensComboIdsLinhas = await tx
    .selectDistinct({ pedidoItemId: pedidoComboItens.pedido_item_id })
    .from(pedidoComboItens)
    .where(and(eq(pedidoComboItens.pedido_id, pedidoId), eq(pedidoComboItens.loja_id, lojaId)));
  const itensComboIds = new Set(itensComboIdsLinhas.map((l) => l.pedidoItemId));

  const componentesLinhas = await tx
    .select({ produtoId: pedidoComboItens.produto_id, quantidade: sql<string>`sum(${pedidoComboItens.quantidade})` })
    .from(pedidoComboItens)
    .where(and(eq(pedidoComboItens.pedido_id, pedidoId), eq(pedidoComboItens.loja_id, lojaId)))
    .groupBy(pedidoComboItens.produto_id);

  async function repor(produtoId: number, quantidade: number): Promise<void> {
    if (produtoId <= 0 || quantidade <= 0) return;
    await tx.insert(estoque).values({ produto_id: produtoId, quantidade: 0, loja_id: lojaId }).onConflictDoNothing({ target: estoque.produto_id });
    await tx.update(estoque).set({ quantidade: sql`${estoque.quantidade} + ${quantidade}` }).where(and(eq(estoque.produto_id, produtoId), eq(estoque.loja_id, lojaId)));
    await tx.insert(estoqueMovimentacoes).values({ produto_id: produtoId, tipo: "entrada", quantidade, origem: "pedido_cancelado", referencia_id: pedidoId, loja_id: lojaId });
    await sincronizarEstoqueVinculo(tx, produtoId, lojaId, { tipo: "entrada", quantidade, origem: "pedido_cancelado", referenciaId: pedidoId });
  }

  for (const item of itens) {
    if (itensComboIds.has(item.id)) continue;
    const produtoId = item.produtoId ?? 0;
    const quantidade = item.quantidade ?? 0;
    await repor(produtoId, quantidade);
  }

  for (const componente of componentesLinhas) {
    await repor(componente.produtoId, Number(componente.quantidade));
  }
}
