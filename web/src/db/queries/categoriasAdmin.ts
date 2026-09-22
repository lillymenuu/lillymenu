import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categorias, produtos, configuracoes } from "@/db/schema";

/* Equivalente de admin/api/v1/categorias.php (GET/POST/PUT/DELETE). */

async function bumpCatalogoVersao(lojaId: number): Promise<void> {
  const valor = String(Date.now() / 1000);
  await db
    .insert(configuracoes)
    .values({ loja_id: lojaId, chave: "catalogo_versao", valor })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
}

export type CategoriaAdmin = { id: number; nome: string | null; ativo: boolean | null; ordem: number | null; modoExibicao: string };

export async function listarCategorias(lojaId: number): Promise<CategoriaAdmin[]> {
  const linhas = await db
    .select({ id: categorias.id, nome: categorias.nome, ativo: categorias.ativo, ordem: categorias.ordem, modoExibicao: categorias.modo_exibicao })
    .from(categorias)
    .where(eq(categorias.loja_id, lojaId))
    .orderBy(sql`${categorias.ordem} is null`, categorias.ordem, categorias.nome);
  return linhas;
}

export async function reordenarCategorias(lojaId: number, ordemIds: number[]): Promise<{ ok: true } | { ok: false; msg: string }> {
  const ids = ordemIds.filter((n) => Number.isFinite(n));
  if (ids.length === 0) return { ok: false, msg: "Lista de ordem invalida." };
  for (let i = 0; i < ids.length; i++) {
    await db.update(categorias).set({ ordem: i + 1 }).where(and(eq(categorias.id, ids[i]), eq(categorias.loja_id, lojaId)));
  }
  await bumpCatalogoVersao(lojaId);
  return { ok: true };
}

export async function excluirCategoria(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "ID invalido." };
  const existe = await db.select({ id: categorias.id }).from(categorias).where(and(eq(categorias.id, id), eq(categorias.loja_id, lojaId))).limit(1);
  if (existe.length === 0) return { ok: false, msg: "Categoria nao encontrada." };

  await db.update(produtos).set({ categoria_id: null }).where(and(eq(produtos.categoria_id, id), eq(produtos.loja_id, lojaId)));
  await db.delete(categorias).where(and(eq(categorias.id, id), eq(categorias.loja_id, lojaId)));
  await bumpCatalogoVersao(lojaId);
  return { ok: true };
}

export type SalvarCategoriaInput = { id?: number; nome: string; ativo?: boolean; modoExibicao?: string };
export type SalvarCategoriaResultado = { ok: true; action: "insert" | "update"; id: number } | { ok: false; msg: string };

const MODOS_VALIDOS = ["vertical", "horizontal", "grid"];

export async function salvarCategoria(lojaId: number, input: SalvarCategoriaInput): Promise<SalvarCategoriaResultado> {
  const nome = input.nome.trim();
  const ativo = Boolean(input.ativo);
  const modo = MODOS_VALIDOS.includes(input.modoExibicao ?? "") ? (input.modoExibicao as string) : "vertical";

  if (!nome) return { ok: false, msg: "Informe o nome da categoria." };

  if (input.id && input.id > 0) {
    await db.update(categorias).set({ nome, ativo, modo_exibicao: modo }).where(and(eq(categorias.id, input.id), eq(categorias.loja_id, lojaId)));
    await bumpCatalogoVersao(lojaId);
    return { ok: true, action: "update", id: input.id };
  }

  const [{ novaOrdem }] = await db.select({ novaOrdem: sql<number>`coalesce(max(${categorias.ordem}), 0) + 1` }).from(categorias).where(eq(categorias.loja_id, lojaId));
  const [inserida] = await db.insert(categorias).values({ nome, ativo, ordem: novaOrdem, loja_id: lojaId, modo_exibicao: modo }).returning({ id: categorias.id });
  await bumpCatalogoVersao(lojaId);
  return { ok: true, action: "insert", id: inserida.id };
}
