import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { complementosGrupos, complementosGruposCategorias, complementosGruposProdutos, complementosItens, categorias, produtos } from "@/db/schema";
import { storageDelete, storageSaveBase64 } from "@/db/queries/storage";
import { timestampFortaleza } from "@/db/queries/tempo";
import { resolverEstoquesItens, type EstoqueComplemento } from "@/db/queries/complementosEstoque";

/*
 * Tela Complementos (/product-complement): grupos de adicionais reaproveitaveis
 * (ex.: "Escolha seu refri", "Sabores da pizza"), cada um com seus itens e
 * vinculado a produtos e/ou categorias inteiras. As tabelas complementos_*
 * vieram do sistema antigo e ate aqui nao tinham tela.
 */

export type ComplementoItem = {
  id: number;
  grupoId: number;
  nome: string;
  descricao: string;
  preco: number;
  podeRepetir: boolean;
  ativo: boolean;
  ordem: number;
  imagem: string | null;
  pontosGanho: number;
  pontosCusto: number;
  estoque: EstoqueComplemento | null;
};

export type ComplementoGrupo = {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
  obrigatorio: boolean;
  quantidadeMinima: number;
  quantidadeMaxima: number;
  produtoIds: number[];
  categoriaIds: number[];
  itens: ComplementoItem[];
};

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; msg: string };

export async function listarComplementos(lojaId: number): Promise<ComplementoGrupo[]> {
  const [grupos, itens, vinculosProdutos, vinculosCategorias] = await Promise.all([
    db.select().from(complementosGrupos).where(eq(complementosGrupos.loja_id, lojaId)).orderBy(asc(complementosGrupos.id)),
    db.select().from(complementosItens).where(eq(complementosItens.loja_id, lojaId)).orderBy(asc(complementosItens.ordem), asc(complementosItens.id)),
    db.select({ grupoId: complementosGruposProdutos.grupo_id, produtoId: complementosGruposProdutos.produto_id }).from(complementosGruposProdutos).where(eq(complementosGruposProdutos.loja_id, lojaId)),
    db.select({ grupoId: complementosGruposCategorias.grupo_id, categoriaId: complementosGruposCategorias.categoria_id }).from(complementosGruposCategorias).where(eq(complementosGruposCategorias.loja_id, lojaId)),
  ]);
  const estoques = await resolverEstoquesItens(lojaId, itens);

  return grupos.map((g) => ({
    id: g.id,
    nome: g.nome,
    descricao: g.descricao ?? "",
    ativo: g.ativo,
    obrigatorio: g.obrigatorio,
    quantidadeMinima: g.quantidade_minima,
    quantidadeMaxima: g.quantidade_maxima,
    produtoIds: vinculosProdutos.filter((v) => v.grupoId === g.id).map((v) => v.produtoId),
    categoriaIds: vinculosCategorias.filter((v) => v.grupoId === g.id).map((v) => v.categoriaId),
    itens: itens
      .filter((i) => i.grupo_id === g.id)
      .map((i) => ({
        id: i.id,
        grupoId: i.grupo_id,
        nome: i.nome,
        descricao: i.descricao ?? "",
        preco: Number(i.preco ?? 0),
        podeRepetir: i.pode_repetir,
        ativo: i.ativo,
        ordem: i.ordem,
        imagem: i.imagem,
        pontosGanho: i.pontos_ganho,
        pontosCusto: i.pontos_custo,
        estoque: estoques.get(i.id) ?? null,
      })),
  }));
}

/** Produtos e categorias da loja, para a etapa de vinculo do grupo. */
export async function opcoesVinculoComplementos(lojaId: number) {
  const [listaProdutos, listaCategorias] = await Promise.all([
    db.select({ id: produtos.id, nome: produtos.nome, categoriaId: produtos.categoria_id }).from(produtos).where(eq(produtos.loja_id, lojaId)).orderBy(asc(produtos.nome)),
    db.select({ id: categorias.id, nome: categorias.nome }).from(categorias).where(eq(categorias.loja_id, lojaId)).orderBy(asc(categorias.nome)),
  ]);
  return {
    produtos: listaProdutos.map((p) => ({ id: p.id, nome: p.nome ?? "", categoriaId: p.categoriaId })),
    categorias: listaCategorias.map((c) => ({ id: c.id, nome: c.nome ?? "" })),
  };
}

/** Clones de grupo compartilham a URL da imagem: so apaga o arquivo se nenhum item usa mais. */
async function apagarImagemSeOrfa(imagem: string | null): Promise<void> {
  if (!imagem) return;
  const [emUso] = await db.select({ id: complementosItens.id }).from(complementosItens).where(eq(complementosItens.imagem, imagem)).limit(1);
  if (!emUso) await storageDelete(imagem);
}

async function grupoDaLoja(lojaId: number, grupoId: number): Promise<boolean> {
  const [g] = await db.select({ id: complementosGrupos.id }).from(complementosGrupos).where(and(eq(complementosGrupos.id, grupoId), eq(complementosGrupos.loja_id, lojaId))).limit(1);
  return Boolean(g);
}

export type SalvarGrupoInput = {
  id?: number;
  nome: string;
  ativo: boolean;
  obrigatorio: boolean;
  quantidadeMinima: number;
  quantidadeMaxima: number;
  produtoIds: number[];
  categoriaIds: number[];
};

export async function salvarGrupoComplemento(lojaId: number, input: SalvarGrupoInput): Promise<Resultado<{ id: number }>> {
  const nome = input.nome.trim();
  if (!nome) return { ok: false, msg: "Informe o nome do grupo." };
  if (nome.length > 120) return { ok: false, msg: "O nome do grupo pode ter no máximo 120 caracteres." };

  const min = Math.max(0, Math.floor(input.quantidadeMinima || 0));
  const max = Math.max(0, Math.floor(input.quantidadeMaxima || 0));
  if (max > 0 && min > max) return { ok: false, msg: "A quantidade mínima não pode ser maior que a máxima." };
  const obrigatorio = input.obrigatorio || min > 0;

  /* so aceita vinculos com produtos/categorias da propria loja */
  const produtoIds = [...new Set(input.produtoIds.filter((n) => n > 0))];
  const categoriaIds = [...new Set(input.categoriaIds.filter((n) => n > 0))];
  const produtosValidos = produtoIds.length
    ? (await db.select({ id: produtos.id }).from(produtos).where(and(eq(produtos.loja_id, lojaId), inArray(produtos.id, produtoIds)))).map((p) => p.id)
    : [];
  const categoriasValidas = categoriaIds.length
    ? (await db.select({ id: categorias.id }).from(categorias).where(and(eq(categorias.loja_id, lojaId), inArray(categorias.id, categoriaIds)))).map((c) => c.id)
    : [];

  if (input.id && !(await grupoDaLoja(lojaId, input.id))) return { ok: false, msg: "Grupo não encontrado." };

  const campos = {
    nome,
    ativo: input.ativo,
    obrigatorio,
    opcional: !obrigatorio,
    quantidade_minima: min,
    quantidade_maxima: max,
  };

  const id = await withTransaction(async (tx) => {
    let grupoId = input.id ?? 0;
    if (grupoId) {
      await tx.update(complementosGrupos).set({ ...campos, atualizado_em: timestampFortaleza() }).where(and(eq(complementosGrupos.id, grupoId), eq(complementosGrupos.loja_id, lojaId)));
      await tx.delete(complementosGruposProdutos).where(eq(complementosGruposProdutos.grupo_id, grupoId));
      await tx.delete(complementosGruposCategorias).where(eq(complementosGruposCategorias.grupo_id, grupoId));
    } else {
      const [novo] = await tx.insert(complementosGrupos).values({ ...campos, loja_id: lojaId }).returning({ id: complementosGrupos.id });
      grupoId = novo.id;
    }
    if (produtosValidos.length) {
      await tx.insert(complementosGruposProdutos).values(produtosValidos.map((produtoId) => ({ grupo_id: grupoId, produto_id: produtoId, loja_id: lojaId })));
    }
    if (categoriasValidas.length) {
      await tx.insert(complementosGruposCategorias).values(categoriasValidas.map((categoriaId) => ({ grupo_id: grupoId, categoria_id: categoriaId, loja_id: lojaId })));
    }
    return grupoId;
  });

  return { ok: true, id };
}

export async function excluirGrupoComplemento(lojaId: number, grupoId: number): Promise<Resultado> {
  if (!(await grupoDaLoja(lojaId, grupoId))) return { ok: false, msg: "Grupo não encontrado." };
  const imagens = await db.select({ imagem: complementosItens.imagem }).from(complementosItens).where(eq(complementosItens.grupo_id, grupoId));
  /* itens e vinculos saem junto (FK on delete cascade) */
  await db.delete(complementosGrupos).where(and(eq(complementosGrupos.id, grupoId), eq(complementosGrupos.loja_id, lojaId)));
  for (const i of imagens) await apagarImagemSeOrfa(i.imagem);
  return { ok: true };
}

/** Copia o grupo com itens e vinculos. A imagem dos itens e reaproveitada (mesma URL). */
export async function clonarGrupoComplemento(lojaId: number, grupoId: number): Promise<Resultado<{ id: number }>> {
  const [grupo] = await db.select().from(complementosGrupos).where(and(eq(complementosGrupos.id, grupoId), eq(complementosGrupos.loja_id, lojaId))).limit(1);
  if (!grupo) return { ok: false, msg: "Grupo não encontrado." };

  const [itens, vinculosProdutos, vinculosCategorias] = await Promise.all([
    db.select().from(complementosItens).where(eq(complementosItens.grupo_id, grupoId)),
    db.select({ produtoId: complementosGruposProdutos.produto_id }).from(complementosGruposProdutos).where(eq(complementosGruposProdutos.grupo_id, grupoId)),
    db.select({ categoriaId: complementosGruposCategorias.categoria_id }).from(complementosGruposCategorias).where(eq(complementosGruposCategorias.grupo_id, grupoId)),
  ]);

  const id = await withTransaction(async (tx) => {
    const [novo] = await tx
      .insert(complementosGrupos)
      .values({
        nome: `${grupo.nome} (cópia)`.slice(0, 120),
        descricao: grupo.descricao,
        ativo: grupo.ativo,
        opcional: grupo.opcional,
        obrigatorio: grupo.obrigatorio,
        quantidade_minima: grupo.quantidade_minima,
        quantidade_maxima: grupo.quantidade_maxima,
        loja_id: lojaId,
      })
      .returning({ id: complementosGrupos.id });

    if (itens.length) {
      await tx.insert(complementosItens).values(
        itens.map((i) => ({
          grupo_id: novo.id,
          nome: i.nome,
          descricao: i.descricao,
          preco: i.preco,
          pode_repetir: i.pode_repetir,
          ativo: i.ativo,
          ordem: i.ordem,
          loja_id: lojaId,
          imagem: i.imagem,
          /* a copia usa o mesmo estoque do original (estoque unico) */
          estoque_produto_id: i.estoque_produto_id,
          estoque_complemento_id: i.estoque_complemento_id,
          pontos_ganho: i.pontos_ganho,
          pontos_custo: i.pontos_custo,
        }))
      );
    }
    if (vinculosProdutos.length) {
      await tx.insert(complementosGruposProdutos).values(vinculosProdutos.map((v) => ({ grupo_id: novo.id, produto_id: v.produtoId, loja_id: lojaId })));
    }
    if (vinculosCategorias.length) {
      await tx.insert(complementosGruposCategorias).values(vinculosCategorias.map((v) => ({ grupo_id: novo.id, categoria_id: v.categoriaId, loja_id: lojaId })));
    }
    return novo.id;
  });

  return { ok: true, id };
}

export type SalvarItemInput = {
  id?: number;
  grupoId: number;
  nome: string;
  descricao: string;
  preco: number;
  podeRepetir: boolean;
  pontosGanho: number;
  pontosCusto: number;
  imagemBase64?: string;
  imagemRemover?: boolean;
};

export async function salvarItemComplemento(lojaId: number, input: SalvarItemInput): Promise<Resultado<{ id: number }>> {
  const nome = input.nome.trim();
  if (!nome) return { ok: false, msg: "Informe o nome do item." };
  if (nome.length > 120) return { ok: false, msg: "O nome do item pode ter no máximo 120 caracteres." };
  const preco = Number(input.preco);
  if (!Number.isFinite(preco) || preco < 0) return { ok: false, msg: "Informe um preço válido." };
  if (!(await grupoDaLoja(lojaId, input.grupoId))) return { ok: false, msg: "Grupo não encontrado." };

  const campos = {
    grupo_id: input.grupoId,
    nome,
    descricao: input.descricao.trim().slice(0, 255) || null,
    preco: Math.round(preco * 100) / 100,
    pode_repetir: input.podeRepetir,
    pontos_ganho: Math.max(0, Math.floor(input.pontosGanho || 0)),
    pontos_custo: Math.max(0, Math.floor(input.pontosCusto || 0)),
  };

  let novaImagem: string | null = null;
  if (input.imagemBase64) {
    novaImagem = await storageSaveBase64(input.imagemBase64, "complementos", "complemento", lojaId);
    if (!novaImagem) return { ok: false, msg: "Imagem inválida." };
  }

  if (input.id) {
    const [atual] = await db.select({ imagem: complementosItens.imagem }).from(complementosItens).where(and(eq(complementosItens.id, input.id), eq(complementosItens.loja_id, lojaId))).limit(1);
    if (!atual) return { ok: false, msg: "Item não encontrado." };

    const set: Record<string, unknown> = { ...campos, atualizado_em: timestampFortaleza() };
    if (novaImagem || input.imagemRemover) set.imagem = novaImagem;
    await db.update(complementosItens).set(set).where(and(eq(complementosItens.id, input.id), eq(complementosItens.loja_id, lojaId)));
    if (novaImagem || input.imagemRemover) await apagarImagemSeOrfa(atual.imagem);
    return { ok: true, id: input.id };
  }

  /* item novo entra no fim do grupo */
  const [{ maxOrdem }] = await db
    .select({ maxOrdem: sql<number>`coalesce(max(${complementosItens.ordem}), -1)` })
    .from(complementosItens)
    .where(eq(complementosItens.grupo_id, input.grupoId));
  const [novo] = await db
    .insert(complementosItens)
    .values({ ...campos, imagem: novaImagem, ordem: Number(maxOrdem) + 1, loja_id: lojaId })
    .returning({ id: complementosItens.id });
  return { ok: true, id: novo.id };
}

export async function alterarAtivoItemComplemento(lojaId: number, itemId: number, ativo: boolean): Promise<Resultado> {
  const r = await db.update(complementosItens).set({ ativo, atualizado_em: timestampFortaleza() }).where(and(eq(complementosItens.id, itemId), eq(complementosItens.loja_id, lojaId))).returning({ id: complementosItens.id });
  return r.length ? { ok: true } : { ok: false, msg: "Item não encontrado." };
}

export async function excluirItemComplemento(lojaId: number, itemId: number): Promise<Resultado> {
  const [item] = await db.delete(complementosItens).where(and(eq(complementosItens.id, itemId), eq(complementosItens.loja_id, lojaId))).returning({ imagem: complementosItens.imagem });
  if (!item) return { ok: false, msg: "Item não encontrado." };
  await apagarImagemSeOrfa(item.imagem);
  return { ok: true };
}

export async function reordenarItensComplemento(lojaId: number, grupoId: number, itemIds: number[]): Promise<Resultado> {
  if (!(await grupoDaLoja(lojaId, grupoId))) return { ok: false, msg: "Grupo não encontrado." };
  await withTransaction(async (tx) => {
    for (const [ordem, id] of itemIds.entries()) {
      await tx.update(complementosItens).set({ ordem }).where(and(eq(complementosItens.id, id), eq(complementosItens.grupo_id, grupoId), eq(complementosItens.loja_id, lojaId)));
    }
  });
  return { ok: true };
}

export type GrupoResumo = { id: number; nome: string; ativo: boolean; totalProdutos: number; totalCategorias: number };

/** Aba Complementos do produto: grupos vinculados direto a ele + todos os grupos da loja (para vincular). */
export async function gruposDoProduto(lojaId: number, produtoId: number): Promise<{ vinculados: GrupoResumo[]; todos: GrupoResumo[] }> {
  const [grupos, vinculosProdutos, vinculosCategorias] = await Promise.all([
    db.select({ id: complementosGrupos.id, nome: complementosGrupos.nome, ativo: complementosGrupos.ativo }).from(complementosGrupos).where(eq(complementosGrupos.loja_id, lojaId)).orderBy(asc(complementosGrupos.nome)),
    db.select({ grupoId: complementosGruposProdutos.grupo_id, produtoId: complementosGruposProdutos.produto_id }).from(complementosGruposProdutos).where(eq(complementosGruposProdutos.loja_id, lojaId)),
    db.select({ grupoId: complementosGruposCategorias.grupo_id }).from(complementosGruposCategorias).where(eq(complementosGruposCategorias.loja_id, lojaId)),
  ]);

  const todos = grupos.map((g) => ({
    ...g,
    totalProdutos: vinculosProdutos.filter((v) => v.grupoId === g.id).length,
    totalCategorias: vinculosCategorias.filter((v) => v.grupoId === g.id).length,
  }));
  const idsDoProduto = new Set(vinculosProdutos.filter((v) => v.produtoId === produtoId).map((v) => v.grupoId));
  return { vinculados: todos.filter((g) => idsDoProduto.has(g.id)), todos };
}

export async function vincularGrupoProduto(lojaId: number, produtoId: number, grupoId: number): Promise<Resultado> {
  if (!(await grupoDaLoja(lojaId, grupoId))) return { ok: false, msg: "Grupo não encontrado." };
  const [produto] = await db.select({ id: produtos.id }).from(produtos).where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId))).limit(1);
  if (!produto) return { ok: false, msg: "Produto não encontrado." };
  await db.insert(complementosGruposProdutos).values({ grupo_id: grupoId, produto_id: produtoId, loja_id: lojaId }).onConflictDoNothing();
  return { ok: true };
}

export async function desvincularGrupoProduto(lojaId: number, produtoId: number, grupoId: number): Promise<Resultado> {
  await db
    .delete(complementosGruposProdutos)
    .where(and(eq(complementosGruposProdutos.grupo_id, grupoId), eq(complementosGruposProdutos.produto_id, produtoId), eq(complementosGruposProdutos.loja_id, lojaId)));
  return { ok: true };
}
