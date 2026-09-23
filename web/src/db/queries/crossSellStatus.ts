import "server-only";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { categorias, produtos, pedidoItens, pedidos } from "@/db/schema";
import { getConfig } from "@/db/queries/config";

/*
 * Equivalente de admin/api/v1/cross_sell_status.php (modal "Configuracoes do
 * Cross-sell" em /settings): grupos de sugestao por co-ocorrencia (com
 * fallback pra categoria de bebidas) + faturamento gerado por cross-sell.
 */

const CROSS_SELL_MIN_PEDIDOS = 3;
const PALAVRAS_BEBIDA = ["bebida", "suco", "refrigerante", "refri", "agua", "água", "drink", "soda", "cola"];

async function coOcorrencias(lojaId: number, nomesCategoria: string[], categoriaPorNome: Map<string, number>, catIdExcluir: number): Promise<string[]> {
  if (nomesCategoria.length === 0) return [];

  const pedidoIdsRaw = await db.selectDistinct({ pedidoId: pedidoItens.pedido_id }).from(pedidoItens).where(and(eq(pedidoItens.loja_id, lojaId), inArray(pedidoItens.produto_nome, nomesCategoria)));
  const pedidoIds = pedidoIdsRaw.map((p) => p.pedidoId).filter((id): id is number => id !== null);

  if (pedidoIds.length < CROSS_SELL_MIN_PEDIDOS) return [];

  const contagem = await db
    .select({ produtoNome: pedidoItens.produto_nome, qtd: sql<string>`count(distinct ${pedidoItens.pedido_id})` })
    .from(pedidoItens)
    .where(and(eq(pedidoItens.loja_id, lojaId), inArray(pedidoItens.pedido_id, pedidoIds)))
    .groupBy(pedidoItens.produto_nome)
    .orderBy(sql`count(distinct ${pedidoItens.pedido_id}) desc`);

  const sugestoes: string[] = [];
  for (const row of contagem) {
    const nome = row.produtoNome;
    if (!nome) continue;
    if (nomesCategoria.includes(nome)) continue;
    const catDoNome = categoriaPorNome.get(nome);
    if (catDoNome === undefined) continue;
    if (catDoNome === catIdExcluir) continue;
    sugestoes.push(nome);
    if (sugestoes.length >= 3) break;
  }
  return sugestoes;
}

export type GrupoCrossSell = { categoria: string; totalProdutos: number; exemplos: string[] };
export type StatusCrossSellResultado = { ativo: boolean; faturamentoExtra: number; grupos: GrupoCrossSell[] };

export async function statusCrossSell(lojaId: number): Promise<StatusCrossSellResultado> {
  const ativo = (await getConfig(lojaId, "cross_sell_ativo", "0")) === "1";

  const grupos: GrupoCrossSell[] = [];

  if (ativo) {
    const cats = await db.select({ id: categorias.id, nome: categorias.nome }).from(categorias).where(and(eq(categorias.loja_id, lojaId), eq(categorias.ativo, true))).orderBy(sql`${categorias.ordem} is null`, categorias.ordem, categorias.nome);

    const produtosPorCategoria = new Map<number, string[]>();
    const categoriaPorNome = new Map<string, number>();
    if (cats.length > 0) {
      const prods = await db
        .select({ nome: produtos.nome, categoriaId: produtos.categoria_id })
        .from(produtos)
        .where(and(eq(produtos.loja_id, lojaId), eq(produtos.ativo, true), sql`${produtos.categoria_id} is not null`))
        .orderBy(sql`${produtos.ordem} is null`, produtos.ordem, produtos.nome);
      for (const p of prods) {
        if (!p.nome || p.categoriaId === null) continue;
        const lista = produtosPorCategoria.get(p.categoriaId) ?? [];
        lista.push(p.nome);
        produtosPorCategoria.set(p.categoriaId, lista);
        categoriaPorNome.set(p.nome, p.categoriaId);
      }
    }

    // Fallback para categorias sem historico suficiente: sugere a categoria de
    // bebidas, identificada pelo nome — complemento mais universal em pedidos
    // de comida, dispensando curadoria manual.
    let catBebidaId: number | null = null;
    for (const cat of cats) {
      const nomeNormalizado = (cat.nome ?? "").toLowerCase();
      if (PALAVRAS_BEBIDA.some((palavra) => nomeNormalizado.includes(palavra))) {
        catBebidaId = cat.id;
        break;
      }
    }
    const produtosBebida = catBebidaId !== null ? (produtosPorCategoria.get(catBebidaId) ?? []) : [];

    for (const cat of cats) {
      const nomesCategoria = produtosPorCategoria.get(cat.id) ?? [];
      if (nomesCategoria.length === 0) continue;

      let sugestoes = await coOcorrencias(lojaId, nomesCategoria, categoriaPorNome, cat.id);

      if (sugestoes.length === 0 && cat.id !== catBebidaId && produtosBebida.length > 0) {
        sugestoes = produtosBebida.slice(0, 3);
      }

      if (sugestoes.length > 0) {
        grupos.push({ categoria: cat.nome ?? "", totalProdutos: sugestoes.length, exemplos: sugestoes });
      }
    }
  }

  const [{ faturamentoExtra }] = await db
    .select({ faturamentoExtra: sql<string>`coalesce(sum(${pedidoItens.preco} * ${pedidoItens.quantidade}), 0)` })
    .from(pedidoItens)
    .innerJoin(pedidos, and(eq(pedidos.id, pedidoItens.pedido_id), eq(pedidos.loja_id, pedidoItens.loja_id)))
    .where(and(eq(pedidoItens.loja_id, lojaId), eq(pedidoItens.cross_sell, true), ne(pedidos.status, "cancelado")));

  return { ativo, faturamentoExtra: Number(faturamentoExtra ?? 0), grupos };
}
