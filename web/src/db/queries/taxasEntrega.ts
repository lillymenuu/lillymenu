import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { taxasBairro, taxasDinamicas, configuracoes } from "@/db/schema";

/*
 * Equivalente de admin/api/v1/taxa_bairro_listar.php, taxa_bairro_salvar.php,
 * taxa_bairro_excluir.php, taxa_dinamica_listar.php, taxa_dinamica_salvar.php
 * e taxa_dinamica_excluir.php: CRUD das regras de taxa de entrega usadas por
 * pdvSalvar.ts/pedidoCriar.ts. Salvar/excluir uma taxa por bairro sempre
 * resincroniza a chave de config 'taxas_bairro' (JSON bairro->valor, e o que
 * o calculo de frete realmente le) — a tabela e so a fonte de gestao/UI.
 */

async function upsertConfig(lojaId: number, chave: string, valor: string): Promise<void> {
  await db
    .insert(configuracoes)
    .values({ loja_id: lojaId, chave, valor })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
}

async function resincronizarConfigBairro(lojaId: number): Promise<void> {
  const linhas = await db.select({ bairro: taxasBairro.bairro, taxa: taxasBairro.taxa }).from(taxasBairro).where(eq(taxasBairro.loja_id, lojaId));
  const mapa: Record<string, number> = {};
  for (const l of linhas) mapa[l.bairro] = l.taxa;
  await upsertConfig(lojaId, "taxas_bairro", JSON.stringify(mapa));
}

export type TaxaBairro = { id: number; bairro: string; taxa: number; tempoMin: number | null; tempoMax: number | null };

export async function listarTaxasBairro(lojaId: number): Promise<TaxaBairro[]> {
  const linhas = await db
    .select({ id: taxasBairro.id, bairro: taxasBairro.bairro, taxa: taxasBairro.taxa, tempoMin: taxasBairro.tempo_min, tempoMax: taxasBairro.tempo_max })
    .from(taxasBairro)
    .where(eq(taxasBairro.loja_id, lojaId))
    .orderBy(taxasBairro.bairro);
  return linhas;
}

export type SalvarTaxaBairroInput = { id?: number; bairro: string; taxa: number | string; tempoMin?: number | string | null; tempoMax?: number | string | null };

function paraNumero(v: string | number): number {
  return typeof v === "number" ? v : Number(String(v).replace(",", "."));
}

function paraInteiroOuNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  return parseInt(String(v), 10);
}

export async function salvarTaxaBairro(lojaId: number, input: SalvarTaxaBairroInput): Promise<{ ok: true } | { ok: false; msg: string }> {
  const bairro = input.bairro.trim();
  const taxa = Math.round(paraNumero(input.taxa) * 100) / 100;
  const tempoMin = paraInteiroOuNull(input.tempoMin);
  const tempoMax = paraInteiroOuNull(input.tempoMax);

  if (bairro === "" || taxa < 0) return { ok: false, msg: "Informe bairro e taxa validos." };
  if (tempoMin !== null && tempoMin < 0) return { ok: false, msg: "Tempo minimo invalido." };
  if (tempoMax !== null && tempoMax < 0) return { ok: false, msg: "Tempo maximo invalido." };
  if (tempoMin !== null && tempoMax !== null && tempoMin > tempoMax) return { ok: false, msg: "Tempo minimo deve ser menor que o maximo." };

  const id = input.id && input.id > 0 ? input.id : 0;
  const condDup = id > 0 ? and(eq(taxasBairro.loja_id, lojaId), sql`lower(${taxasBairro.bairro}) = lower(${bairro})`, ne(taxasBairro.id, id)) : and(eq(taxasBairro.loja_id, lojaId), sql`lower(${taxasBairro.bairro}) = lower(${bairro})`);
  const duplicado = await db.select({ id: taxasBairro.id }).from(taxasBairro).where(condDup).limit(1);
  if (duplicado.length > 0) return { ok: false, msg: "Ja existe uma taxa cadastrada para este bairro." };

  if (id > 0) {
    await db.update(taxasBairro).set({ bairro, taxa, tempo_min: tempoMin, tempo_max: tempoMax, atualizado_em: sql`now()` }).where(and(eq(taxasBairro.id, id), eq(taxasBairro.loja_id, lojaId)));
  } else {
    await db.insert(taxasBairro).values({ bairro, taxa, tempo_min: tempoMin, tempo_max: tempoMax, loja_id: lojaId });
  }

  await resincronizarConfigBairro(lojaId);
  await upsertConfig(lojaId, "taxa_entrega_tipo", "bairro");

  return { ok: true };
}

export async function excluirTaxaBairro(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "ID invalido." };
  await db.delete(taxasBairro).where(and(eq(taxasBairro.id, id), eq(taxasBairro.loja_id, lojaId)));
  await resincronizarConfigBairro(lojaId);
  return { ok: true };
}

export type TaxaDinamica = { id: number; distanciaKm: number; valor: number; tipo: "fixa" | "por_km"; tempoMin: number | null; tempoMax: number | null };

export async function listarTaxasDinamicas(lojaId: number): Promise<TaxaDinamica[]> {
  const linhas = await db
    .select({ id: taxasDinamicas.id, distanciaKm: taxasDinamicas.distancia_km, valor: taxasDinamicas.valor, tipo: taxasDinamicas.tipo, tempoMin: taxasDinamicas.tempo_min, tempoMax: taxasDinamicas.tempo_max })
    .from(taxasDinamicas)
    .where(eq(taxasDinamicas.loja_id, lojaId))
    .orderBy(taxasDinamicas.distancia_km);
  return linhas;
}

export type SalvarTaxaDinamicaInput = { id?: number; distanciaKm: number | string; valor: number | string; tipo?: string; tempoMin?: number | string | null; tempoMax?: number | string | null };

export async function salvarTaxaDinamica(lojaId: number, input: SalvarTaxaDinamicaInput): Promise<{ ok: true } | { ok: false; msg: string }> {
  const distancia = Math.round(paraNumero(input.distanciaKm) * 100) / 100;
  const valor = Math.round(paraNumero(input.valor) * 100) / 100;
  const tipo = input.tipo === "por_km" ? "por_km" : "fixa";
  const tempoMin = paraInteiroOuNull(input.tempoMin);
  const tempoMax = paraInteiroOuNull(input.tempoMax);

  if (distancia <= 0 || valor < 0) return { ok: false, msg: "Informe distancia e valor validos." };
  if (distancia > 100) return { ok: false, msg: "Distancia maxima permitida: 100km." };
  if (tempoMin !== null && tempoMin < 0) return { ok: false, msg: "Tempo minimo invalido." };
  if (tempoMax !== null && tempoMax < 0) return { ok: false, msg: "Tempo maximo invalido." };
  if (tempoMin !== null && tempoMax !== null && tempoMin > tempoMax) return { ok: false, msg: "Tempo minimo deve ser menor que o maximo." };

  const id = input.id && input.id > 0 ? input.id : 0;
  const condDup = id > 0 ? and(eq(taxasDinamicas.loja_id, lojaId), eq(taxasDinamicas.distancia_km, distancia), ne(taxasDinamicas.id, id)) : and(eq(taxasDinamicas.loja_id, lojaId), eq(taxasDinamicas.distancia_km, distancia));
  const duplicado = await db.select({ id: taxasDinamicas.id }).from(taxasDinamicas).where(condDup).limit(1);
  if (duplicado.length > 0) return { ok: false, msg: "Ja existe uma taxa dinamica para esta distancia." };

  if (id > 0) {
    await db.update(taxasDinamicas).set({ distancia_km: distancia, valor, tipo, tempo_min: tempoMin, tempo_max: tempoMax, atualizado_em: sql`now()` }).where(and(eq(taxasDinamicas.id, id), eq(taxasDinamicas.loja_id, lojaId)));
  } else {
    await db.insert(taxasDinamicas).values({ distancia_km: distancia, valor, tipo, tempo_min: tempoMin, tempo_max: tempoMax, loja_id: lojaId });
  }

  await upsertConfig(lojaId, "taxa_entrega_tipo", "dinamica");

  return { ok: true };
}

export async function excluirTaxaDinamica(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "ID invalido." };
  await db.delete(taxasDinamicas).where(and(eq(taxasDinamicas.id, id), eq(taxasDinamicas.loja_id, lojaId)));
  return { ok: true };
}
