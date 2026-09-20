import type { PosCartItem, PosProduto } from "@/lib/pos";

/**
 * Unidades de cada produto que o carrinho do balcao ja vai consumir: linhas de produto (inclusive as
 * de variacao) e os componentes escolhidos dentro de combos. `ignorarRowKey` deixa de fora a linha que
 * esta sendo editada (ela sera recalculada pelo proprio modal).
 */
export function consumoDoCarrinho(itens: PosCartItem[], ignorarRowKey?: string | null): Record<number, number> {
  const consumo: Record<number, number> = {};
  for (const item of itens) {
    if (ignorarRowKey && item.rowKey === ignorarRowKey) continue;
    /* Itens de um pedido reaberto pra edicao ja tiveram o estoque baixado — nao consomem de novo. */
    if (item.rowKey.startsWith("edicao-")) continue;
    if (item.combosels?.length) {
      for (const sel of item.combosels) consumo[sel.id] = (consumo[sel.id] ?? 0) + sel.qtd * item.qtd;
    } else if (item.produtoId !== null) {
      consumo[item.produtoId] = (consumo[item.produtoId] ?? 0) + item.qtd;
    }
  }
  return consumo;
}

/** Quanto ainda da pra adicionar de `produto` (produtos do mesmo grupo de estoque dividem o mesmo saldo). */
export function estoqueRestanteProduto(produto: PosProduto, produtos: PosProduto[], consumo: Record<number, number>): number {
  if (produto.grupo_estoque_id === null) return produto.estoque - (consumo[produto.id] ?? 0);
  const reservado = produtos
    .filter((p) => p.grupo_estoque_id === produto.grupo_estoque_id)
    .reduce((s, p) => s + (consumo[p.id] ?? 0), 0);
  return produto.estoque - reservado;
}
