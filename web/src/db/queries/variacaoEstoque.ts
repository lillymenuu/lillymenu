import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { db, NeonTx } from "@/db";
import { estoque, estoqueMovimentacoes, produtos, produtoVariacoes } from "@/db/schema";

/*
 * Estoque por variacao (produtos.variacoes_estoque): cada variacao tem saldo proprio em
 * produto_variacoes.estoque_quantidade e o estoque do produto (tabela estoque) e mantido como a
 * soma delas — por isso a vitrine, as checagens e a baixa do produto continuam iguais, e aqui so
 * entra o que e da variacao. Quem vende chama baixarEstoqueVariacao junto da baixa do produto.
 */

/**
 * Desconta qtd da variacao vendida, se o produto controla estoque por variacao. Com exigirSaldo,
 * falta de saldo aborta a transacao com a mensagem pro cliente/operador.
 */
export async function baixarEstoqueVariacao(
  tx: NeonTx,
  produtoId: number | null | undefined,
  variacaoId: number | null | undefined,
  qtd: number,
  lojaId: number,
  exigirSaldo = true
): Promise<void> {
  if (!produtoId || !variacaoId || qtd <= 0) return;
  const [v] = await tx
    .select({ tamanho: produtoVariacoes.tamanho, cor: produtoVariacoes.cor, produtoNome: produtos.nome, controla: produtos.variacoes_estoque })
    .from(produtoVariacoes)
    .innerJoin(produtos, eq(produtos.id, produtoVariacoes.produto_id))
    .where(and(eq(produtoVariacoes.id, variacaoId), eq(produtoVariacoes.produto_id, produtoId), eq(produtoVariacoes.loja_id, lojaId)))
    .limit(1);
  if (!v?.controla) return;

  const condicoes = [eq(produtoVariacoes.id, variacaoId), eq(produtoVariacoes.loja_id, lojaId)];
  if (exigirSaldo) condicoes.push(sql`${produtoVariacoes.estoque_quantidade} >= ${qtd}`);
  const atualizadas = await tx
    .update(produtoVariacoes)
    .set({ estoque_quantidade: sql`${produtoVariacoes.estoque_quantidade} - ${qtd}` })
    .where(and(...condicoes))
    .returning({ id: produtoVariacoes.id });

  if (atualizadas.length === 0) {
    const nomeVariacao = [v.tamanho, v.cor].filter(Boolean).join(" - ");
    throw new Error(`"${v.produtoNome}${nomeVariacao ? ` - ${nomeVariacao}` : ""}" está sem estoque suficiente no momento.`);
  }
}

/** Devolve qtd a variacao (pedido cancelado), se o produto controla estoque por variacao. */
export async function reporEstoqueVariacao(tx: NeonTx, variacaoId: number, qtd: number, lojaId: number): Promise<void> {
  if (variacaoId <= 0 || qtd <= 0) return;
  await tx
    .update(produtoVariacoes)
    .set({ estoque_quantidade: sql`${produtoVariacoes.estoque_quantidade} + ${qtd}` })
    .where(
      and(
        eq(produtoVariacoes.id, variacaoId),
        eq(produtoVariacoes.loja_id, lojaId),
        inArray(produtoVariacoes.produto_id, tx.select({ id: produtos.id }).from(produtos).where(eq(produtos.variacoes_estoque, true)))
      )
    );
}

/**
 * Estoque do produto = soma das variacoes (chamar depois de editar as variacoes no admin), com a
 * diferenca registrada como ajuste nas movimentacoes. Devolve a soma.
 */
export async function sincronizarEstoqueProdutoComVariacoes(conexao: typeof db | NeonTx, produtoId: number, lojaId: number): Promise<number> {
  const [{ total }] = await conexao
    .select({ total: sql<string>`coalesce(sum(greatest(${produtoVariacoes.estoque_quantidade}, 0)), 0)` })
    .from(produtoVariacoes)
    .where(and(eq(produtoVariacoes.produto_id, produtoId), eq(produtoVariacoes.loja_id, lojaId)));
  const quantidade = Number(total);

  const [atual] = await conexao.select({ quantidade: estoque.quantidade }).from(estoque).where(and(eq(estoque.produto_id, produtoId), eq(estoque.loja_id, lojaId))).limit(1);
  const delta = quantidade - (atual?.quantidade ?? 0);
  await conexao.insert(estoque).values({ produto_id: produtoId, quantidade, loja_id: lojaId }).onConflictDoUpdate({ target: estoque.produto_id, set: { quantidade } });
  if (delta !== 0) {
    await conexao.insert(estoqueMovimentacoes).values({ produto_id: produtoId, tipo: delta > 0 ? "entrada" : "saida", quantidade: Math.abs(delta), origem: "ajuste", loja_id: lojaId });
  }
  return quantidade;
}
