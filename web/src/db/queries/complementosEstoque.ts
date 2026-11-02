import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { complementosEstoques, complementosGrupos, complementosItens, estoque, produtos } from "@/db/schema";
import { salvarEstoque } from "@/db/queries/estoqueAdmin";
import { timestampFortaleza } from "@/db/queries/tempo";

/*
 * Estoque dos itens de complemento (aba "Gerenciar estoque"). O item pode:
 *  - usar o estoque de um produto (estoque_produto_id -> tabela estoque): mesmo item vendido como
 *    produto e como adicional, com um unico saldo;
 *  - usar um estoque proprio de complementos (estoque_complemento_id -> complementos_estoques),
 *    que outros itens de complemento tambem podem compartilhar.
 */

export type EstoqueTipo = "produto" | "complemento";

export type EstoqueComplemento = {
  tipo: EstoqueTipo;
  id: number;
  nome: string;
  quantidade: number;
  quantidadeMinima: number;
};

export type EstoqueDetalhe = EstoqueComplemento & { itensVinculados: { id: number; nome: string; grupo: string }[] };

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; msg: string };

type LinhaItem = { id: number; estoque_produto_id: number | null; estoque_complemento_id: number | null };

/** Estoque resolvido de cada item (por id do item). */
export async function resolverEstoquesItens(lojaId: number, itens: LinhaItem[]): Promise<Map<number, EstoqueComplemento>> {
  const produtoIds = [...new Set(itens.map((i) => i.estoque_produto_id).filter((v): v is number => v !== null))];
  const complementoIds = [...new Set(itens.map((i) => i.estoque_complemento_id).filter((v): v is number => v !== null))];

  const [linhasProduto, linhasComplemento] = await Promise.all([
    produtoIds.length
      ? db
          .select({ id: produtos.id, nome: produtos.nome, quantidade: estoque.quantidade, minima: estoque.quantidade_minima })
          .from(produtos)
          .leftJoin(estoque, eq(estoque.produto_id, produtos.id))
          .where(and(eq(produtos.loja_id, lojaId), inArray(produtos.id, produtoIds)))
      : [],
    complementoIds.length
      ? db.select().from(complementosEstoques).where(and(eq(complementosEstoques.loja_id, lojaId), inArray(complementosEstoques.id, complementoIds)))
      : [],
  ]);

  const porProduto = new Map(linhasProduto.map((l) => [l.id, l]));
  const porComplemento = new Map(linhasComplemento.map((l) => [l.id, l]));
  const mapa = new Map<number, EstoqueComplemento>();
  for (const i of itens) {
    const p = i.estoque_produto_id !== null ? porProduto.get(i.estoque_produto_id) : undefined;
    if (p) {
      mapa.set(i.id, { tipo: "produto", id: p.id, nome: p.nome ?? "", quantidade: p.quantidade ?? 0, quantidadeMinima: p.minima ?? 0 });
      continue;
    }
    const c = i.estoque_complemento_id !== null ? porComplemento.get(i.estoque_complemento_id) : undefined;
    if (c) mapa.set(i.id, { tipo: "complemento", id: c.id, nome: c.nome, quantidade: c.quantidade, quantidadeMinima: c.quantidade_minima });
  }
  return mapa;
}

async function itemDaLoja(lojaId: number, itemId: number): Promise<LinhaItem & { nome: string } | null> {
  const [item] = await db
    .select({ id: complementosItens.id, nome: complementosItens.nome, estoque_produto_id: complementosItens.estoque_produto_id, estoque_complemento_id: complementosItens.estoque_complemento_id })
    .from(complementosItens)
    .where(and(eq(complementosItens.id, itemId), eq(complementosItens.loja_id, lojaId)))
    .limit(1);
  return item ?? null;
}

/** Estoque atual do item, para devolver ao modal depois de cada acao. */
export async function estoqueDoItem(lojaId: number, itemId: number): Promise<EstoqueComplemento | null> {
  const item = await itemDaLoja(lojaId, itemId);
  if (!item) return null;
  return (await resolverEstoquesItens(lojaId, [item])).get(item.id) ?? null;
}

/** Estoques que um item pode usar: os dos produtos (que ja tem estoque) e os proprios de complementos. */
export async function opcoesEstoqueComplemento(lojaId: number): Promise<{ tipo: EstoqueTipo; id: number; nome: string; quantidade: number }[]> {
  const [deProdutos, deComplementos] = await Promise.all([
    db
      .select({ id: produtos.id, nome: produtos.nome, quantidade: estoque.quantidade })
      .from(estoque)
      .innerJoin(produtos, eq(produtos.id, estoque.produto_id))
      .where(eq(estoque.loja_id, lojaId))
      .orderBy(asc(produtos.nome)),
    db.select({ id: complementosEstoques.id, nome: complementosEstoques.nome, quantidade: complementosEstoques.quantidade }).from(complementosEstoques).where(eq(complementosEstoques.loja_id, lojaId)).orderBy(asc(complementosEstoques.nome)),
  ]);
  return [
    ...deComplementos.map((c) => ({ tipo: "complemento" as const, id: c.id, nome: c.nome, quantidade: c.quantidade })),
    ...deProdutos.map((p) => ({ tipo: "produto" as const, id: p.id, nome: p.nome ?? "", quantidade: p.quantidade })),
  ];
}

/** Detalhe para o modal "Editar item de estoque": saldo + adicionais que usam esse estoque. */
export async function detalheEstoqueComplemento(lojaId: number, tipo: EstoqueTipo, id: number): Promise<Resultado<{ estoque: EstoqueDetalhe }>> {
  let base: EstoqueComplemento | null = null;
  if (tipo === "produto") {
    const [p] = await db
      .select({ id: produtos.id, nome: produtos.nome, quantidade: estoque.quantidade, minima: estoque.quantidade_minima })
      .from(produtos)
      .leftJoin(estoque, eq(estoque.produto_id, produtos.id))
      .where(and(eq(produtos.id, id), eq(produtos.loja_id, lojaId)))
      .limit(1);
    if (p) base = { tipo, id: p.id, nome: p.nome ?? "", quantidade: p.quantidade ?? 0, quantidadeMinima: p.minima ?? 0 };
  } else {
    const [c] = await db.select().from(complementosEstoques).where(and(eq(complementosEstoques.id, id), eq(complementosEstoques.loja_id, lojaId))).limit(1);
    if (c) base = { tipo, id: c.id, nome: c.nome, quantidade: c.quantidade, quantidadeMinima: c.quantidade_minima };
  }
  if (!base) return { ok: false, msg: "Estoque não encontrado." };

  const coluna = tipo === "produto" ? complementosItens.estoque_produto_id : complementosItens.estoque_complemento_id;
  const itens = await db
    .select({ id: complementosItens.id, nome: complementosItens.nome, grupo: complementosGrupos.nome })
    .from(complementosItens)
    .innerJoin(complementosGrupos, eq(complementosGrupos.id, complementosItens.grupo_id))
    .where(and(eq(complementosItens.loja_id, lojaId), eq(coluna, id)))
    .orderBy(asc(complementosItens.nome));

  return { ok: true, estoque: { ...base, itensVinculados: itens } };
}

/** Liga o item a um estoque existente (de produto ou de complemento). */
export async function vincularEstoqueItem(lojaId: number, itemId: number, tipo: EstoqueTipo, id: number): Promise<Resultado<{ estoque: EstoqueComplemento | null }>> {
  if (!(await itemDaLoja(lojaId, itemId))) return { ok: false, msg: "Item não encontrado." };
  const detalhe = await detalheEstoqueComplemento(lojaId, tipo, id);
  if (!detalhe.ok) return detalhe;

  await db
    .update(complementosItens)
    .set({ estoque_produto_id: tipo === "produto" ? id : null, estoque_complemento_id: tipo === "complemento" ? id : null, atualizado_em: timestampFortaleza() })
    .where(and(eq(complementosItens.id, itemId), eq(complementosItens.loja_id, lojaId)));
  return { ok: true, estoque: await estoqueDoItem(lojaId, itemId) };
}

export async function desvincularEstoqueItem(lojaId: number, itemId: number): Promise<Resultado> {
  const r = await db
    .update(complementosItens)
    .set({ estoque_produto_id: null, estoque_complemento_id: null, atualizado_em: timestampFortaleza() })
    .where(and(eq(complementosItens.id, itemId), eq(complementosItens.loja_id, lojaId)))
    .returning({ id: complementosItens.id });
  return r.length ? { ok: true } : { ok: false, msg: "Item não encontrado." };
}

function quantidadeValida(n: number) {
  return Number.isInteger(n) && n >= 0 && n <= 999999;
}

/**
 * Salva o saldo do estoque e quais itens de complemento usam ele. Sem `id`, cria um estoque proprio
 * de complementos com o nome do item `itemOrigemId`. Itens que estavam ligados e sairam da lista
 * ficam sem estoque.
 */
export async function salvarEstoqueComplemento(
  lojaId: number,
  input: { tipo: EstoqueTipo; id?: number; itemOrigemId?: number; quantidade: number; quantidadeMinima: number; itemIds: number[] }
): Promise<Resultado<{ tipo: EstoqueTipo; id: number }>> {
  if (!quantidadeValida(input.quantidade) || !quantidadeValida(input.quantidadeMinima)) return { ok: false, msg: "Informe quantidades válidas." };

  let tipo = input.tipo;
  let id = input.id ?? 0;

  if (!id) {
    const origem = input.itemOrigemId ? await itemDaLoja(lojaId, input.itemOrigemId) : null;
    if (!origem) return { ok: false, msg: "Item não encontrado." };
    tipo = "complemento";
    const [novo] = await db
      .insert(complementosEstoques)
      .values({ loja_id: lojaId, nome: origem.nome, quantidade: input.quantidade, quantidade_minima: input.quantidadeMinima })
      .returning({ id: complementosEstoques.id });
    id = novo.id;
  } else if (tipo === "produto") {
    /* estoque do produto: mesma rotina da tela Estoque (registra movimentacao e espelha os vinculados) */
    const r = await salvarEstoque(lojaId, id, input.quantidade, input.quantidadeMinima);
    if (!r.ok) return r;
  } else {
    const r = await db
      .update(complementosEstoques)
      .set({ quantidade: input.quantidade, quantidade_minima: input.quantidadeMinima, atualizado_em: timestampFortaleza() })
      .where(and(eq(complementosEstoques.id, id), eq(complementosEstoques.loja_id, lojaId)))
      .returning({ id: complementosEstoques.id });
    if (!r.length) return { ok: false, msg: "Estoque não encontrado." };
  }

  const itemIds = [...new Set(input.itemIds.filter((n) => n > 0))];
  const coluna = tipo === "produto" ? complementosItens.estoque_produto_id : complementosItens.estoque_complemento_id;
  await db
    .update(complementosItens)
    .set({ estoque_produto_id: null, estoque_complemento_id: null })
    .where(and(eq(complementosItens.loja_id, lojaId), eq(coluna, id)));
  if (itemIds.length) {
    await db
      .update(complementosItens)
      .set({ estoque_produto_id: tipo === "produto" ? id : null, estoque_complemento_id: tipo === "complemento" ? id : null })
      .where(and(eq(complementosItens.loja_id, lojaId), inArray(complementosItens.id, itemIds)));
  }

  return { ok: true, tipo, id };
}

/** Apaga um estoque proprio de complementos (os itens ligados ficam sem estoque — FK on delete set null). */
export async function apagarEstoqueComplemento(lojaId: number, id: number): Promise<Resultado> {
  const r = await db.delete(complementosEstoques).where(and(eq(complementosEstoques.id, id), eq(complementosEstoques.loja_id, lojaId))).returning({ id: complementosEstoques.id });
  return r.length ? { ok: true } : { ok: false, msg: "Estoque não encontrado." };
}

/** Todos os itens de complemento da loja (para "vincular outros itens"). */
export async function listarItensParaVinculo(lojaId: number) {
  return db
    .select({ id: complementosItens.id, nome: complementosItens.nome, grupo: complementosGrupos.nome })
    .from(complementosItens)
    .innerJoin(complementosGrupos, eq(complementosGrupos.id, complementosItens.grupo_id))
    .where(eq(complementosItens.loja_id, lojaId))
    .orderBy(asc(complementosGrupos.nome), asc(complementosItens.nome));
}
