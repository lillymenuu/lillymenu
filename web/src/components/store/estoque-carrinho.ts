import type { StoreCartItem } from "@/lib/store/types";

/**
 * Unidades de cada produto que o carrinho ja consome: linhas de produto (inclusive variacoes, que dividem
 * o estoque do produto) e os componentes escolhidos dentro de combos.
 */
export function consumoDoCarrinho(itens: StoreCartItem[]): Record<number, number> {
  const consumo: Record<number, number> = {};
  for (const item of itens) {
    if (item.tipo === "combo") {
      for (const sel of item.combosels ?? []) consumo[sel.id] = (consumo[sel.id] ?? 0) + sel.qtd * item.qtd;
    } else {
      consumo[item.id] = (consumo[item.id] ?? 0) + item.qtd;
    }
  }
  return consumo;
}
