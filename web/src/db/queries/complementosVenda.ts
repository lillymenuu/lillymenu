import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, type NeonTx } from "@/db";
import { complementosEstoques, complementosGrupos, complementosGruposCategorias, complementosGruposProdutos, complementosItens, pedidoItemOpcoes, produtos } from "@/db/schema";
import { resolverEstoquesItens } from "@/db/queries/complementosEstoque";
import { baixarEstoque } from "@/db/queries/estoqueVinculo";
import type { ComplementoEscolhido, ComplementoGrupoVenda } from "@/lib/complementos";

/*
 * Complementos na hora da venda (PDV e loja online): quais grupos o produto oferece, quais
 * produtos tem complementos (para o catalogo saber quando abrir o modal) e o registro das
 * escolhas no pedido, com baixa do estoque dos itens.
 */

/** Grupos ativos do produto — vinculados direto a ele ou a categoria dele — com os itens ativos. */
export async function complementosDoProduto(lojaId: number, produtoId: number): Promise<ComplementoGrupoVenda[]> {
  const [produto] = await db.select({ categoriaId: produtos.categoria_id }).from(produtos).where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId))).limit(1);
  if (!produto) return [];

  const [porProduto, porCategoria] = await Promise.all([
    db.select({ grupoId: complementosGruposProdutos.grupo_id }).from(complementosGruposProdutos).where(and(eq(complementosGruposProdutos.produto_id, produtoId), eq(complementosGruposProdutos.loja_id, lojaId))),
    produto.categoriaId
      ? db.select({ grupoId: complementosGruposCategorias.grupo_id }).from(complementosGruposCategorias).where(and(eq(complementosGruposCategorias.categoria_id, produto.categoriaId), eq(complementosGruposCategorias.loja_id, lojaId)))
      : [],
  ]);
  const grupoIds = [...new Set([...porProduto, ...porCategoria].map((v) => v.grupoId))];
  if (grupoIds.length === 0) return [];

  const [grupos, itens] = await Promise.all([
    db.select().from(complementosGrupos).where(and(inArray(complementosGrupos.id, grupoIds), eq(complementosGrupos.loja_id, lojaId), eq(complementosGrupos.ativo, true))).orderBy(asc(complementosGrupos.id)),
    db
      .select()
      .from(complementosItens)
      .where(and(inArray(complementosItens.grupo_id, grupoIds), eq(complementosItens.loja_id, lojaId), eq(complementosItens.ativo, true)))
      .orderBy(asc(complementosItens.ordem), asc(complementosItens.id)),
  ]);
  const estoques = await resolverEstoquesItens(lojaId, itens);

  return grupos
    .map((g) => ({
      id: g.id,
      nome: g.nome,
      obrigatorio: g.obrigatorio,
      minimo: g.quantidade_minima,
      maximo: g.quantidade_maxima,
      itens: itens
        .filter((i) => i.grupo_id === g.id)
        .map((i) => ({
          id: i.id,
          nome: i.nome,
          descricao: i.descricao ?? "",
          preco: Number(i.preco ?? 0),
          podeRepetir: i.pode_repetir,
          imagem: i.imagem,
          estoque: estoques.get(i.id)?.quantidade ?? null,
        })),
    }))
    .filter((g) => g.itens.length > 0);
}

/** Ids dos produtos da loja que tem ao menos um grupo de complementos ativo (direto ou pela categoria). */
export async function produtosComComplementos(lojaId: number): Promise<Set<number>> {
  const gruposAtivos = db
    .select({ id: complementosGrupos.id })
    .from(complementosGrupos)
    .where(
      and(
        eq(complementosGrupos.loja_id, lojaId),
        eq(complementosGrupos.ativo, true),
        sql`exists (select 1 from ${complementosItens} where ${complementosItens.grupo_id} = ${complementosGrupos.id} and ${complementosItens.ativo})`
      )
    );
  const [diretos, categorias] = await Promise.all([
    db.select({ produtoId: complementosGruposProdutos.produto_id }).from(complementosGruposProdutos).where(and(eq(complementosGruposProdutos.loja_id, lojaId), inArray(complementosGruposProdutos.grupo_id, gruposAtivos))),
    db.select({ categoriaId: complementosGruposCategorias.categoria_id }).from(complementosGruposCategorias).where(and(eq(complementosGruposCategorias.loja_id, lojaId), inArray(complementosGruposCategorias.grupo_id, gruposAtivos))),
  ]);
  const ids = new Set(diretos.map((d) => d.produtoId));
  const categoriaIds = [...new Set(categorias.map((c) => c.categoriaId))];
  if (categoriaIds.length > 0) {
    const daCategoria = await db.select({ id: produtos.id }).from(produtos).where(and(eq(produtos.loja_id, lojaId), inArray(produtos.categoria_id, categoriaIds)));
    for (const p of daCategoria) ids.add(p.id);
  }
  return ids;
}

/**
 * Grava os complementos escolhidos de um item do pedido (snapshot de grupo/nome/quantidade em
 * pedido_item_opcoes) e baixa o estoque deles: o do produto vinculado (mesma rotina dos produtos)
 * ou o estoque proprio de complementos. Ids que nao sao da loja sao ignorados.
 */
export async function registrarComplementosItem(
  tx: NeonTx,
  pedidoItemId: number,
  complementos: ComplementoEscolhido[] | null | undefined,
  qtdItem: number,
  lojaId: number,
  pedidoId: number
): Promise<void> {
  const escolhidos = (complementos ?? []).filter((c) => c.id > 0 && c.qtd > 0);
  if (escolhidos.length === 0) return;

  const itens = await tx
    .select({
      id: complementosItens.id,
      nome: complementosItens.nome,
      grupoId: complementosItens.grupo_id,
      grupoNome: complementosGrupos.nome,
      estoqueProdutoId: complementosItens.estoque_produto_id,
      estoqueComplementoId: complementosItens.estoque_complemento_id,
    })
    .from(complementosItens)
    .innerJoin(complementosGrupos, eq(complementosGrupos.id, complementosItens.grupo_id))
    .where(and(eq(complementosItens.loja_id, lojaId), inArray(complementosItens.id, escolhidos.map((c) => c.id))));

  const linhas: (typeof pedidoItemOpcoes.$inferInsert)[] = [];
  for (const c of escolhidos) {
    const item = itens.find((i) => i.id === c.id);
    if (!item) continue;
    linhas.push({ pedido_item_id: pedidoItemId, tipo: "complemento", grupo_id: item.grupoId, referencia_id: item.id, titulo: item.grupoNome, nome: item.nome, quantidade: c.qtd, loja_id: lojaId });

    const total = c.qtd * Math.max(1, qtdItem);
    if (item.estoqueProdutoId) {
      await baixarEstoque(tx, item.estoqueProdutoId, lojaId, total, "pedido", pedidoId);
    } else if (item.estoqueComplementoId) {
      await tx
        .update(complementosEstoques)
        .set({ quantidade: sql`greatest(${complementosEstoques.quantidade} - ${total}, 0)` })
        .where(and(eq(complementosEstoques.id, item.estoqueComplementoId), eq(complementosEstoques.loja_id, lojaId)));
    }
  }
  if (linhas.length > 0) await tx.insert(pedidoItemOpcoes).values(linhas);
}
