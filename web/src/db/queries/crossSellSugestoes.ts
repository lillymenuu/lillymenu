import "server-only";
import { and, eq, inArray, sql, notInArray, desc } from "drizzle-orm";
import { db } from "@/db";
import { pedidoItens, produtos, categorias, estoque } from "@/db/schema";
import { getConfig } from "@/db/queries/config";

/*
 * Equivalente de public/api/cross_sell_sugestoes.php: sugere produtos pra
 * "Peca tambem" no carrinho da loja publica, com base no historico real de
 * pedidos (o que costuma ser comprado junto) e, sem historico suficiente,
 * um fallback pela categoria de bebidas.
 */

const MIN_PEDIDOS = 3;
const PALAVRAS_BEBIDA = ["bebida", "suco", "refrigerante", "refri", "agua", "água", "drink", "soda", "cola"];

async function nomesPorFrequencia(lojaId: number, nomesCarrinho: string[]): Promise<string[]> {
  if (nomesCarrinho.length === 0) return [];

  const pedidoIdsLinhas = await db
    .selectDistinct({ pedidoId: pedidoItens.pedido_id })
    .from(pedidoItens)
    .where(and(eq(pedidoItens.loja_id, lojaId), inArray(pedidoItens.produto_nome, nomesCarrinho)));
  const pedidoIds = pedidoIdsLinhas.map((l) => l.pedidoId).filter((id): id is number => id !== null);
  if (pedidoIds.length < MIN_PEDIDOS) return [];

  const linhas = await db
    .select({ nome: pedidoItens.produto_nome, qtd: sql<string>`count(distinct ${pedidoItens.pedido_id})` })
    .from(pedidoItens)
    .where(and(eq(pedidoItens.loja_id, lojaId), inArray(pedidoItens.pedido_id, pedidoIds)))
    .groupBy(pedidoItens.produto_nome)
    .orderBy(desc(sql`count(distinct ${pedidoItens.pedido_id})`));

  const nomesCarrinhoSet = new Set(nomesCarrinho);
  return linhas.map((l) => l.nome).filter((nome): nome is string => nome !== null && !nomesCarrinhoSet.has(nome));
}

function promoAtivaSimples(precoBase: number, precoPromocional: number | null, promoDesativado: boolean, promoDias: number | null, promoInicio: string | null): number {
  if (promoDesativado || precoPromocional === null || precoPromocional <= 0) return precoBase;
  if (promoDias != null && promoInicio) {
    const fim = new Date(promoInicio);
    fim.setDate(fim.getDate() + promoDias);
    if (fim.getTime() <= new Date(new Date().toDateString()).getTime()) return precoBase;
  }
  return precoPromocional;
}

export type CrossSellProdutoSugerido = { id: number; nome: string; preco: number; imagem: string; estoque: number; pontosGanho: number };

export async function crossSellSugestoes(lojaId: number, idsCarrinho: number[], nomesCarrinhoExtra: string[]): Promise<{ ok: true; ativo: boolean; produtos: CrossSellProdutoSugerido[] }> {
  const ativo = (await getConfig(lojaId, "cross_sell_ativo", "0")) === "1";
  if (!ativo) return { ok: true, ativo: false, produtos: [] };

  let nomesCarrinho: string[] = [];
  if (idsCarrinho.length > 0) {
    const linhas = await db.select({ nome: produtos.nome }).from(produtos).where(and(inArray(produtos.id, idsCarrinho), eq(produtos.loja_id, lojaId)));
    nomesCarrinho = linhas.map((l) => l.nome).filter((n): n is string => n !== null);
  }
  nomesCarrinho = [...new Set([...nomesCarrinho, ...nomesCarrinhoExtra.filter((n) => n !== "")])];

  let nomesSugeridos = await nomesPorFrequencia(lojaId, nomesCarrinho);

  if (nomesSugeridos.length === 0) {
    const cats = await db.select({ id: categorias.id, nome: categorias.nome }).from(categorias).where(and(eq(categorias.loja_id, lojaId), eq(categorias.ativo, true)));
    let catBebidaId: number | null = null;
    for (const cat of cats) {
      const nomeNorm = (cat.nome ?? "").toLowerCase();
      if (PALAVRAS_BEBIDA.some((p) => nomeNorm.includes(p))) {
        catBebidaId = cat.id;
        break;
      }
    }

    if (catBebidaId !== null && idsCarrinho.length > 0) {
      const categoriasCarrinho = await db.select({ categoriaId: produtos.categoria_id }).from(produtos).where(and(inArray(produtos.id, idsCarrinho), eq(produtos.loja_id, lojaId)));
      const temItemNaoBebida = categoriasCarrinho.some((c) => c.categoriaId !== catBebidaId);
      if (temItemNaoBebida) {
        const bebidas = await db
          .select({ nome: produtos.nome })
          .from(produtos)
          .where(and(eq(produtos.categoria_id, catBebidaId), eq(produtos.loja_id, lojaId), eq(produtos.ativo, true)))
          .orderBy(sql`${produtos.ordem} is null`, produtos.ordem, produtos.nome);
        nomesSugeridos = bebidas.map((b) => b.nome).filter((n): n is string => n !== null);
      }
    }
  }

  if (nomesSugeridos.length === 0) return { ok: true, ativo: true, produtos: [] };

  const condExcluir = idsCarrinho.length > 0 ? notInArray(produtos.id, idsCarrinho) : undefined;
  const linhasProd = await db
    .select({
      id: produtos.id,
      nome: produtos.nome,
      preco: produtos.preco,
      imagem: produtos.imagem,
      precoPromocional: produtos.preco_promocional,
      promoDesativado: produtos.promo_desativado,
      promoDias: produtos.promo_dias,
      promoInicio: produtos.promo_inicio,
      pontosGanho: produtos.pontos_ganho,
      estoqueQtd: estoque.quantidade,
    })
    .from(produtos)
    .leftJoin(estoque, and(eq(estoque.produto_id, produtos.id), eq(estoque.loja_id, produtos.loja_id)))
    .where(and(inArray(produtos.nome, nomesSugeridos), eq(produtos.loja_id, lojaId), eq(produtos.ativo, true), condExcluir));

  const porNome = new Map(linhasProd.map((p) => [p.nome, p]));

  const produtosResultado: CrossSellProdutoSugerido[] = [];
  for (const nome of nomesSugeridos) {
    const p = porNome.get(nome);
    if (!p) continue;
    const estoqueQtd = p.estoqueQtd ?? 0;
    if (estoqueQtd <= 0) continue;

    const precoBase = Number(p.preco ?? 0);
    const precoFinal = promoAtivaSimples(precoBase, p.precoPromocional, p.promoDesativado, p.promoDias, p.promoInicio);

    produtosResultado.push({ id: p.id, nome: p.nome ?? "", preco: precoFinal, imagem: p.imagem ?? "", estoque: estoqueQtd, pontosGanho: p.pontosGanho ?? 0 });
    if (produtosResultado.length >= 3) break;
  }

  return { ok: true, ativo: true, produtos: produtosResultado };
}
