import "server-only";
import { and, eq, ilike, inArray, ne, notInArray, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import type { NeonTx } from "@/db";
import { estoque, estoqueGrupos, estoqueGrupoMembros, estoqueMovimentacoes, configuracoes, pedidoComboItens, produtos } from "@/db/schema";

/*
 * Equivalente de admin/helpers/estoque_vinculo_module.php: produtos vinculados
 * ao mesmo grupo espelham a mesma quantidade de estoque. Toda escrita em
 * `estoque` deve chamar sincronizarEstoqueVinculo depois.
 */

/** `db` (fora de transacao) ou `tx` (dentro de uma) — as duas tem a mesma API de leitura. */
type Queryable = typeof db | NeonTx;

/** Ids de produto no mesmo grupo de produtoId (incluindo ele mesmo). Sem grupo, devolve so [produtoId]. */
export async function membrosDoGrupo(conexao: Queryable, produtoId: number, lojaId: number): Promise<number[]> {
  if (produtoId <= 0) return [];
  const proprio = await conexao
    .select({ grupoId: estoqueGrupoMembros.grupo_id })
    .from(estoqueGrupoMembros)
    .where(and(eq(estoqueGrupoMembros.produto_id, produtoId), eq(estoqueGrupoMembros.loja_id, lojaId)))
    .limit(1);
  const grupoId = proprio[0]?.grupoId;
  if (grupoId === undefined) return [produtoId];

  const linhas = await conexao
    .select({ produtoId: estoqueGrupoMembros.produto_id })
    .from(estoqueGrupoMembros)
    .where(and(eq(estoqueGrupoMembros.grupo_id, grupoId), eq(estoqueGrupoMembros.loja_id, lojaId)));
  const ids = linhas.map((l) => l.produtoId);
  return ids.length > 0 ? ids : [produtoId];
}

/** Bump em catalogo_versao: avisa a loja publica (polling) que o catalogo mudou. */
export async function bumpCatalogoVersao(tx: NeonTx, lojaId: number): Promise<void> {
  const valor = String(Date.now() / 1000);
  await tx
    .insert(configuracoes)
    .values({ loja_id: lojaId, chave: "catalogo_versao", valor })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
}

export type MovimentoEstoque = {
  tipo: "entrada" | "saida";
  quantidade: number;
  origem: string;
  referenciaId?: number | null;
};

/** Chamar DEPOIS de qualquer escrita em `estoque` para produtoId. Espelha o saldo pros outros membros do grupo. */
export async function sincronizarEstoqueVinculo(tx: NeonTx, produtoId: number, lojaId: number, mov?: MovimentoEstoque): Promise<void> {
  if (produtoId <= 0) return;
  await bumpCatalogoVersao(tx, lojaId);

  const membros = await membrosDoGrupo(tx, produtoId, lojaId);
  const outros = membros.filter((id) => id !== produtoId);
  if (outros.length === 0) return;

  const linhaAtual = await tx
    .select({ quantidade: estoque.quantidade })
    .from(estoque)
    .where(and(eq(estoque.produto_id, produtoId), eq(estoque.loja_id, lojaId)))
    .limit(1);
  if (linhaAtual.length === 0) return;
  const quantidade = linhaAtual[0].quantidade;

  for (const outroId of outros) {
    await tx
      .insert(estoque)
      .values({ produto_id: outroId, quantidade: 0, loja_id: lojaId })
      .onConflictDoNothing({ target: estoque.produto_id });
    await tx.update(estoque).set({ quantidade }).where(and(eq(estoque.produto_id, outroId), eq(estoque.loja_id, lojaId)));
    if (mov) {
      await tx.insert(estoqueMovimentacoes).values({
        produto_id: outroId,
        tipo: mov.tipo,
        quantidade: mov.quantidade,
        origem: mov.origem,
        referencia_id: mov.referenciaId ?? null,
        loja_id: lojaId,
      });
    }
  }
}

/*
 * Equivalente de admin/helpers/combo_estoque_module.php: registra os produtos
 * que compuseram um item de combo, para o cancelamento saber o que devolver.
 */
export async function registrarComponentesCombo(
  tx: NeonTx,
  pedidoId: number,
  pedidoItemId: number,
  combosels: { id: number; qtd?: number }[],
  qtdItem: number,
  lojaId: number
): Promise<void> {
  if (pedidoItemId <= 0 || combosels.length === 0) return;
  for (const sel of combosels) {
    const selId = sel.id;
    const selQtd = (sel.qtd ?? 1) * Math.max(1, qtdItem);
    if (selId > 0 && selQtd > 0) {
      await tx.insert(pedidoComboItens).values({ pedido_id: pedidoId, pedido_item_id: pedidoItemId, produto_id: selId, quantidade: selQtd, loja_id: lojaId });
    }
  }
}

/** Desconta `quantidade` do estoque de produtoId (nao deixa negativo) e sincroniza o grupo. */
export async function baixarEstoque(tx: NeonTx, produtoId: number, lojaId: number, quantidade: number, origem: string, referenciaId: number): Promise<void> {
  if (produtoId <= 0 || quantidade <= 0) return;
  await tx
    .update(estoque)
    .set({ quantidade: sql`${estoque.quantidade} - ${quantidade}` })
    .where(and(eq(estoque.produto_id, produtoId), eq(estoque.loja_id, lojaId), sql`${estoque.quantidade} >= ${quantidade}`));
  await sincronizarEstoqueVinculo(tx, produtoId, lojaId, { tipo: "saida", quantidade, origem, referenciaId });
}

/** Uso fora de transacao (ex.: leitura de saldo atual) — helper de conveniencia. */
export async function estoqueDisponivel(produtoId: number, lojaId: number): Promise<number> {
  const linhas = await db
    .select({ quantidade: estoque.quantidade })
    .from(estoque)
    .where(and(eq(estoque.produto_id, produtoId), eq(estoque.loja_id, lojaId)))
    .limit(1);
  return linhas[0]?.quantidade ?? 0;
}

/*
 * Equivalente de admin/api/estoque_vinculo_produtos.php (GET) e
 * estoque_vinculo_save.php (POST), combinados por admin/api/v1/estoque_vinculo.php:
 * tela "Vincular itens" do produto (produtos que dividem o mesmo saldo fisico).
 */

export type ProdutoVinculo = { id: number; nome: string; imagem: string | null; categoriaId: number | null; vinculado: boolean };

export async function listarProdutosVinculo(lojaId: number, produtoId: number, search: string): Promise<{ ok: true; produtos: ProdutoVinculo[] } | { ok: false; msg: string }> {
  if (produtoId <= 0) return { ok: false, msg: "Produto invalido." };

  const termo = search.trim();
  const condicoes = [eq(produtos.loja_id, lojaId), eq(produtos.ativo, true), ne(produtos.id, produtoId)];
  if (termo !== "") condicoes.push(ilike(produtos.nome, `%${termo}%`));

  const linhas = await db
    .select({ id: produtos.id, nome: produtos.nome, imagem: produtos.imagem, categoriaId: produtos.categoria_id })
    .from(produtos)
    .where(and(...condicoes))
    .orderBy(produtos.nome)
    .limit(300);

  const membros = new Set(await membrosDoGrupo(db, produtoId, lojaId));

  return {
    ok: true,
    produtos: linhas.map((p) => ({ id: p.id, nome: p.nome ?? "", imagem: p.imagem, categoriaId: p.categoriaId, vinculado: membros.has(p.id) })),
  };
}

export type SalvarVinculoInput = { produtoId: number; produtoIds: number[] };

export async function salvarVinculoEstoque(lojaId: number, input: SalvarVinculoInput): Promise<{ ok: true } | { ok: false; msg: string }> {
  const produtoId = input.produtoId;
  if (produtoId <= 0) return { ok: false, msg: "Produto invalido." };

  try {
    return await withTransaction(async (tx): Promise<{ ok: true } | { ok: false; msg: string }> => {
      const [prod] = await tx.select({ id: produtos.id }).from(produtos).where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId))).limit(1);
      if (!prod) return { ok: false, msg: "Produto nao encontrado nesta loja." };

      const idsUnicos = [...new Set(input.produtoIds.filter((id) => id > 0 && id !== produtoId))];
      let selecionados: number[] = [];
      if (idsUnicos.length > 0) {
        const validos = await tx.select({ id: produtos.id }).from(produtos).where(and(inArray(produtos.id, idsUnicos), eq(produtos.loja_id, lojaId)));
        const validosSet = new Set(validos.map((v) => v.id));
        selecionados = idsUnicos.filter((id) => validosSet.has(id));
      }

      if (selecionados.length === 0) {
        await tx.delete(estoqueGrupoMembros).where(and(eq(estoqueGrupoMembros.produto_id, produtoId), eq(estoqueGrupoMembros.loja_id, lojaId)));
        await bumpCatalogoVersao(tx, lojaId);
        return { ok: true };
      }

      const desejados = [produtoId, ...selecionados];

      const [grupoAtual] = await tx.select({ grupoId: estoqueGrupoMembros.grupo_id }).from(estoqueGrupoMembros).where(and(eq(estoqueGrupoMembros.produto_id, produtoId), eq(estoqueGrupoMembros.loja_id, lojaId))).limit(1);
      let grupoId = grupoAtual?.grupoId ?? 0;

      if (grupoId <= 0) {
        const [novoGrupo] = await tx.insert(estoqueGrupos).values({ loja_id: lojaId }).returning({ id: estoqueGrupos.id });
        grupoId = novoGrupo.id;
      }

      await tx.delete(estoqueGrupoMembros).where(and(eq(estoqueGrupoMembros.grupo_id, grupoId), eq(estoqueGrupoMembros.loja_id, lojaId), notInArray(estoqueGrupoMembros.produto_id, desejados)));

      for (const id of desejados) {
        await tx
          .insert(estoqueGrupoMembros)
          .values({ produto_id: id, grupo_id: grupoId, loja_id: lojaId })
          .onConflictDoUpdate({ target: estoqueGrupoMembros.produto_id, set: { grupo_id: grupoId } });
      }

      await sincronizarEstoqueVinculo(tx, produtoId, lojaId);
      await bumpCatalogoVersao(tx, lojaId);
      return { ok: true };
    });
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : "Erro ao salvar vinculo." };
  }
}
