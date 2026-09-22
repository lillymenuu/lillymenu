import "server-only";
import { and, eq, inArray, asc } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { estoque, estoqueGrupoMembros, estoqueMovimentacoes, produtos } from "@/db/schema";
import { membrosDoGrupo, sincronizarEstoqueVinculo, bumpCatalogoVersao, type MovimentoEstoque } from "@/db/queries/estoqueVinculo";

/*
 * Equivalente de admin/api/v1/estoque_listar.php e estoque.php (GET/POST/DELETE
 * combinados): tela dedicada de estoque (/stock).
 */

export type ItemEstoque = { id: number; nome: string | null; quantidade: number };

export async function listarEstoque(lojaId: number): Promise<ItemEstoque[]> {
  const linhas = await db
    .select({ id: produtos.id, nome: produtos.nome, quantidade: estoque.quantidade })
    .from(produtos)
    .leftJoin(estoque, and(eq(estoque.produto_id, produtos.id), eq(estoque.loja_id, produtos.loja_id)))
    .where(eq(produtos.loja_id, lojaId))
    .orderBy(asc(produtos.nome));
  return linhas.map((l) => ({ id: l.id, nome: l.nome, quantidade: l.quantidade ?? 0 }));
}

export type DetalheEstoque = { quantidade: number; quantidadeMinima: number; vinculados: { id: number; nome: string | null }[] };

export async function detalheEstoque(lojaId: number, produtoId: number): Promise<{ ok: true } & DetalheEstoque | { ok: false; msg: string }> {
  if (produtoId <= 0) return { ok: false, msg: "Produto invalido." };

  const [linha] = await db
    .select({ quantidade: estoque.quantidade, quantidadeMinima: estoque.quantidade_minima })
    .from(produtos)
    .leftJoin(estoque, and(eq(estoque.produto_id, produtos.id), eq(estoque.loja_id, produtos.loja_id)))
    .where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId)))
    .limit(1);

  const quantidade = linha?.quantidade ?? 0;
  const quantidadeMinima = linha?.quantidadeMinima ?? 0;

  const membros = await membrosDoGrupo(db, produtoId, lojaId);
  const outros = membros.filter((id) => id !== produtoId);

  let vinculados: { id: number; nome: string | null }[] = [];
  if (outros.length > 0) {
    vinculados = await db.select({ id: produtos.id, nome: produtos.nome }).from(produtos).where(and(inArray(produtos.id, outros), eq(produtos.loja_id, lojaId)));
  }

  return { ok: true, quantidade, quantidadeMinima, vinculados };
}

export async function salvarEstoque(lojaId: number, produtoId: number, quantidade: number, quantidadeMinima: number): Promise<{ ok: true; quantidade: number; quantidadeMinima: number } | { ok: false; msg: string }> {
  if (produtoId <= 0 || quantidade < 0 || quantidadeMinima < 0) return { ok: false, msg: "Dados invalidos." };

  const [produto] = await db.select({ id: produtos.id }).from(produtos).where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId))).limit(1);
  if (!produto) return { ok: false, msg: "Produto nao encontrado." };

  try {
    await withTransaction(async (tx) => {
      await tx.insert(estoque).values({ produto_id: produtoId, quantidade: 0, loja_id: lojaId }).onConflictDoNothing({ target: estoque.produto_id });

      const [atual] = await tx.select({ quantidade: estoque.quantidade }).from(estoque).where(and(eq(estoque.produto_id, produtoId), eq(estoque.loja_id, lojaId))).limit(1);
      const quantidadeAtual = atual?.quantidade ?? 0;

      await tx.update(estoque).set({ quantidade, quantidade_minima: quantidadeMinima }).where(and(eq(estoque.produto_id, produtoId), eq(estoque.loja_id, lojaId)));

      const delta = quantidade - quantidadeAtual;
      let mov: MovimentoEstoque | undefined;
      if (delta !== 0) {
        const tipo: "entrada" | "saida" = delta > 0 ? "entrada" : "saida";
        mov = { tipo, quantidade: Math.abs(delta), origem: "ajuste", referenciaId: null };
        await tx.insert(estoqueMovimentacoes).values({ produto_id: produtoId, tipo, quantidade: Math.abs(delta), origem: "ajuste", loja_id: lojaId });
      }

      await sincronizarEstoqueVinculo(tx, produtoId, lojaId, mov);
    });

    return { ok: true, quantidade, quantidadeMinima };
  } catch {
    return { ok: false, msg: "Erro ao atualizar estoque." };
  }
}

export async function excluirEstoque(lojaId: number, produtoId: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (produtoId <= 0) return { ok: false, msg: "Produto invalido." };
  await withTransaction(async (tx) => {
    await tx.delete(estoque).where(and(eq(estoque.produto_id, produtoId), eq(estoque.loja_id, lojaId)));
    await tx.delete(estoqueGrupoMembros).where(and(eq(estoqueGrupoMembros.produto_id, produtoId), eq(estoqueGrupoMembros.loja_id, lojaId)));
    await bumpCatalogoVersao(tx, lojaId);
  });
  return { ok: true };
}
