import "server-only";
import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { combos, comboPassos, comboPassoOpcoes, produtos, categorias, estoque, configuracoes } from "@/db/schema";
import { storageSaveBase64, storageDelete } from "@/db/queries/storage";

/*
 * Equivalente de admin/api/combo_save.php, combo_get.php, combo_delete.php,
 * combo_toggle.php, combo_passo_save.php, combo_passo_delete.php,
 * combo_passos_reordenar.php, combo_opcoes_produtos.php e
 * admin/api/v1/combo_listar.php: CRUD de combos (passos com opcoes de
 * produto) do catalogo administrativo.
 *
 * As tabelas combos/combo_passos/combo_passo_opcoes ja existem no schema
 * migrado (o PHP faz CREATE TABLE IF NOT EXISTS a cada chamada — aqui e
 * no-op, omitido). Sem FK com ON DELETE CASCADE no MySQL original, entao
 * as exclusoes em cascata (passo -> opcoes, combo -> passos -> opcoes) sao
 * feitas manualmente, igual ao PHP.
 */

async function bumpCatalogoVersao(lojaId: number): Promise<void> {
  const valor = String(Date.now() / 1000);
  await db
    .insert(configuracoes)
    .values({ loja_id: lojaId, chave: "catalogo_versao", valor })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
}

export type ComboResumo = {
  id: number;
  nome: string;
  imagem: string | null;
  categoriaId: number | null;
  tipoPreco: "por_combo" | "por_item";
  preco: number;
  precoPromocional: number | null;
  promoDesativado: boolean;
  ativo: boolean;
};

export async function listarCombos(lojaId: number): Promise<ComboResumo[]> {
  const linhas = await db
    .select({
      id: combos.id,
      nome: combos.nome,
      imagem: combos.imagem,
      categoriaId: combos.categoria_id,
      tipoPreco: combos.tipo_preco,
      preco: combos.preco,
      precoPromocional: combos.preco_promocional,
      promoDesativado: combos.promo_desativado,
      ativo: combos.ativo,
    })
    .from(combos)
    .where(eq(combos.loja_id, lojaId))
    .orderBy(sql`${combos.ordem} is null`, combos.ordem, combos.nome);
  return linhas;
}

export type OpcaoPassoCombo = { id: number; nome: string | null; preco: number | null; imagem: string | null; estoque: number; esgotado: boolean };
export type PassoCombo = { id: number; nome: string; descricao: string | null; obrigatorio: boolean; minItens: number; maxItens: number; permiteRepetir: boolean; opcoes: OpcaoPassoCombo[] };
export type ComboDetalhe = {
  id: number;
  nome: string;
  descricao: string | null;
  imagem: string | null;
  tipoPreco: "por_combo" | "por_item";
  preco: number;
  precoPromocional: number | null;
  promoDesativado: boolean;
  ativo: boolean;
  categoriaId: number | null;
};

export async function detalheCombo(lojaId: number, comboId: number): Promise<{ ok: false; msg: string } | { ok: true; combo: ComboDetalhe; passos: PassoCombo[] }> {
  if (comboId <= 0) return { ok: false, msg: "ID invalido" };

  const linhas = await db
    .select({
      id: combos.id,
      nome: combos.nome,
      descricao: combos.descricao,
      imagem: combos.imagem,
      tipoPreco: combos.tipo_preco,
      preco: combos.preco,
      precoPromocional: combos.preco_promocional,
      promoDesativado: combos.promo_desativado,
      ativo: combos.ativo,
      categoriaId: combos.categoria_id,
    })
    .from(combos)
    .where(and(eq(combos.id, comboId), eq(combos.loja_id, lojaId)))
    .limit(1);
  const combo = linhas[0];
  if (!combo) return { ok: false, msg: "Combo nao encontrado" };

  const passosLinhas = await db
    .select({ id: comboPassos.id, nome: comboPassos.nome, descricao: comboPassos.descricao, obrigatorio: comboPassos.obrigatorio, minItens: comboPassos.min_itens, maxItens: comboPassos.max_itens, permiteRepetir: comboPassos.permite_repetir })
    .from(comboPassos)
    .where(and(eq(comboPassos.combo_id, comboId), eq(comboPassos.loja_id, lojaId)))
    .orderBy(sql`${comboPassos.ordem} is null`, comboPassos.ordem, comboPassos.id);

  const passos: PassoCombo[] = [];
  for (const passo of passosLinhas) {
    const opcoesLinhas = await db
      .select({ id: comboPassoOpcoes.produto_id, nome: produtos.nome, preco: produtos.preco, imagem: produtos.imagem, estoque: sql<number>`coalesce(${estoque.quantidade}, 0)` })
      .from(comboPassoOpcoes)
      .innerJoin(produtos, and(eq(produtos.id, comboPassoOpcoes.produto_id), eq(produtos.loja_id, comboPassoOpcoes.loja_id)))
      .leftJoin(estoque, and(eq(estoque.produto_id, comboPassoOpcoes.produto_id), eq(estoque.loja_id, comboPassoOpcoes.loja_id)))
      .where(and(eq(comboPassoOpcoes.passo_id, passo.id), eq(comboPassoOpcoes.loja_id, lojaId)))
      .orderBy(sql`${comboPassoOpcoes.ordem} is null`, comboPassoOpcoes.ordem, comboPassoOpcoes.id);

    passos.push({ ...passo, opcoes: opcoesLinhas.map((o) => ({ ...o, esgotado: o.estoque <= 0 })) });
  }

  return { ok: true, combo, passos };
}

export type SalvarComboInput = {
  id?: number;
  nome: string;
  descricao?: string;
  categoriaId?: number | null;
  tipoPreco?: "por_combo" | "por_item";
  preco?: number;
  precoPromocional?: number | null;
  promoDesativado?: boolean;
  imagemBase64?: string;
  imagemRemover?: boolean;
  ativo?: boolean;
};

export async function salvarCombo(lojaId: number, input: SalvarComboInput): Promise<{ ok: true; comboId: number } | { ok: false; msg: string }> {
  const nome = input.nome.trim();
  if (!nome) return { ok: false, msg: "Informe o nome do combo." };

  const categoriaId = input.categoriaId && input.categoriaId > 0 ? input.categoriaId : null;
  const descricao = (input.descricao ?? "").trim() || null;
  const tipoPreco = input.tipoPreco === "por_item" ? "por_item" : "por_combo";
  const preco = Math.max(0, Number(input.preco ?? 0));
  const precoPromocional = input.precoPromocional !== undefined && input.precoPromocional !== null ? Math.max(0, Number(input.precoPromocional)) : null;
  const promoDesativado = Boolean(input.promoDesativado);
  const ativo = input.ativo === undefined ? true : Boolean(input.ativo);

  let imagemExistente: string | null = null;
  if (input.id && input.id > 0) {
    const atual = await db.select({ imagem: combos.imagem }).from(combos).where(and(eq(combos.id, input.id), eq(combos.loja_id, lojaId))).limit(1);
    imagemExistente = atual[0]?.imagem ?? null;
  }
  let imagemPath = imagemExistente;

  if (input.imagemRemover && imagemExistente) {
    await storageDelete(imagemExistente);
    imagemPath = null;
  } else if (input.imagemBase64) {
    const novaImagem = await storageSaveBase64(input.imagemBase64, "combos", "combo", lojaId);
    if (novaImagem !== null) {
      if (imagemExistente) await storageDelete(imagemExistente);
      imagemPath = novaImagem;
    }
  }

  let comboId = input.id ?? 0;
  if (comboId > 0) {
    const set: Record<string, unknown> = { nome, descricao, tipo_preco: tipoPreco, preco, preco_promocional: precoPromocional, promo_desativado: promoDesativado, categoria_id: categoriaId, ativo };
    if (imagemPath !== imagemExistente) set.imagem = imagemPath;
    await db.update(combos).set(set).where(and(eq(combos.id, comboId), eq(combos.loja_id, lojaId)));
  } else {
    /* insert sempre grava ativo=1, igual ao PHP (ignora o $ativo recebido na criacao). */
    const [inserido] = await db
      .insert(combos)
      .values({ loja_id: lojaId, categoria_id: categoriaId, nome, descricao, imagem: imagemPath, tipo_preco: tipoPreco, preco, preco_promocional: precoPromocional, promo_desativado: promoDesativado, ativo: true })
      .returning({ id: combos.id });
    comboId = inserido.id;
  }

  await bumpCatalogoVersao(lojaId);
  return { ok: true, comboId };
}

export async function excluirCombo(lojaId: number, comboId: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (comboId <= 0) return { ok: false, msg: "ID invalido" };
  const linhas = await db.select({ id: combos.id, imagem: combos.imagem }).from(combos).where(and(eq(combos.id, comboId), eq(combos.loja_id, lojaId))).limit(1);
  if (!linhas[0]) return { ok: false, msg: "Combo nao encontrado" };

  const passoIds = await db.select({ id: comboPassos.id }).from(comboPassos).where(and(eq(comboPassos.combo_id, comboId), eq(comboPassos.loja_id, lojaId)));
  for (const p of passoIds) {
    await db.delete(comboPassoOpcoes).where(and(eq(comboPassoOpcoes.passo_id, p.id), eq(comboPassoOpcoes.loja_id, lojaId)));
  }
  await db.delete(comboPassos).where(and(eq(comboPassos.combo_id, comboId), eq(comboPassos.loja_id, lojaId)));
  await db.delete(combos).where(and(eq(combos.id, comboId), eq(combos.loja_id, lojaId)));

  await storageDelete(linhas[0].imagem);
  await bumpCatalogoVersao(lojaId);
  return { ok: true };
}

export async function toggleCombo(lojaId: number, id: number, ativo: boolean): Promise<{ ok: true } | { ok: false }> {
  if (id <= 0) return { ok: false };
  await db.update(combos).set({ ativo }).where(and(eq(combos.id, id), eq(combos.loja_id, lojaId)));
  await bumpCatalogoVersao(lojaId);
  return { ok: true };
}

export type SalvarPassoComboInput = {
  passoId?: number;
  comboId: number;
  nome: string;
  descricao?: string;
  obrigatorio?: boolean;
  minItens?: number;
  maxItens?: number;
  permiteRepetir?: boolean;
  produtoIds: number[];
};

export async function salvarPassoCombo(lojaId: number, input: SalvarPassoComboInput): Promise<{ ok: true; passoId: number } | { ok: false; msg: string }> {
  const nome = input.nome.trim();
  const produtoIds = Array.from(new Set(input.produtoIds.filter((n) => Number.isInteger(n) && n > 0)));

  if (input.comboId <= 0) return { ok: false, msg: "combo_id invalido" };
  if (!nome) return { ok: false, msg: "Informe o nome do passo." };
  if (produtoIds.length === 0) return { ok: false, msg: "Adicione pelo menos uma opcao ao passo." };

  const comboExiste = await db.select({ id: combos.id }).from(combos).where(and(eq(combos.id, input.comboId), eq(combos.loja_id, lojaId))).limit(1);
  if (comboExiste.length === 0) return { ok: false, msg: "Combo nao encontrado." };

  const obrigatorio = input.obrigatorio === undefined ? true : Boolean(input.obrigatorio);
  const minItens = Math.max(0, Number(input.minItens ?? 1));
  const maxItens = Math.max(1, Number(input.maxItens ?? 1));
  const permiteRepetir = Boolean(input.permiteRepetir);
  const descricao = (input.descricao ?? "").trim() || null;

  let passoId = input.passoId ?? 0;
  if (passoId > 0) {
    await db
      .update(comboPassos)
      .set({ nome, descricao, obrigatorio, min_itens: minItens, max_itens: maxItens, permite_repetir: permiteRepetir })
      .where(and(eq(comboPassos.id, passoId), eq(comboPassos.combo_id, input.comboId), eq(comboPassos.loja_id, lojaId)));
  } else {
    const [inserido] = await db
      .insert(comboPassos)
      .values({ combo_id: input.comboId, loja_id: lojaId, nome, descricao, obrigatorio, min_itens: minItens, max_itens: maxItens, permite_repetir: permiteRepetir })
      .returning({ id: comboPassos.id });
    passoId = inserido.id;
  }

  await db.delete(comboPassoOpcoes).where(and(eq(comboPassoOpcoes.passo_id, passoId), eq(comboPassoOpcoes.loja_id, lojaId)));
  for (const pid of produtoIds) {
    await db.insert(comboPassoOpcoes).values({ passo_id: passoId, combo_id: input.comboId, loja_id: lojaId, produto_id: pid });
  }

  await bumpCatalogoVersao(lojaId);
  return { ok: true, passoId };
}

export async function excluirPassoCombo(lojaId: number, passoId: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (passoId <= 0) return { ok: false, msg: "ID invalido" };
  const existe = await db.select({ id: comboPassos.id }).from(comboPassos).where(and(eq(comboPassos.id, passoId), eq(comboPassos.loja_id, lojaId))).limit(1);
  if (existe.length === 0) return { ok: false, msg: "Passo nao encontrado" };

  await db.delete(comboPassoOpcoes).where(and(eq(comboPassoOpcoes.passo_id, passoId), eq(comboPassoOpcoes.loja_id, lojaId)));
  await db.delete(comboPassos).where(and(eq(comboPassos.id, passoId), eq(comboPassos.loja_id, lojaId)));
  await bumpCatalogoVersao(lojaId);
  return { ok: true };
}

export async function reordenarPassosCombo(lojaId: number, comboId: number, passoIds: number[]): Promise<{ ok: true } | { ok: false; msg: string }> {
  const ids = passoIds.filter((n) => Number.isInteger(n) && n > 0);
  if (comboId <= 0 || ids.length === 0) return { ok: false, msg: "Dados invalidos." };
  for (let i = 0; i < ids.length; i++) {
    await db.update(comboPassos).set({ ordem: i + 1 }).where(and(eq(comboPassos.id, ids[i]), eq(comboPassos.combo_id, comboId), eq(comboPassos.loja_id, lojaId)));
  }
  await bumpCatalogoVersao(lojaId);
  return { ok: true };
}

export type OpcaoProdutoBusca = { id: number; nome: string | null; preco: number | null; imagem: string | null; categoriaId: number | null; categoria: string | null };

export async function opcoesProdutosCombo(lojaId: number, search?: string, categoriaId?: number): Promise<{ produtos: OpcaoProdutoBusca[]; categorias: { id: number; nome: string | null }[] }> {
  const categoriasLinhas = await db
    .select({ id: categorias.id, nome: categorias.nome })
    .from(categorias)
    .where(and(eq(categorias.loja_id, lojaId), eq(categorias.ativo, true)))
    .orderBy(sql`${categorias.ordem} is null`, categorias.ordem, categorias.nome);

  const condicoes = [eq(produtos.loja_id, lojaId), eq(produtos.ativo, true)];
  if (search) condicoes.push(ilike(produtos.nome, `%${search}%`));
  if (categoriaId && categoriaId > 0) condicoes.push(eq(produtos.categoria_id, categoriaId));

  const produtosLinhas = await db
    .select({ id: produtos.id, nome: produtos.nome, preco: produtos.preco, imagem: produtos.imagem, categoriaId: produtos.categoria_id, categoria: categorias.nome })
    .from(produtos)
    .leftJoin(categorias, and(eq(categorias.id, produtos.categoria_id), eq(categorias.loja_id, produtos.loja_id)))
    .where(and(...condicoes))
    .orderBy(sql`${categorias.ordem} is null`, categorias.ordem, categorias.nome, produtos.nome)
    .limit(300);

  return { produtos: produtosLinhas, categorias: categoriasLinhas };
}
