import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { configuracoes } from "@/db/schema";

/* Equivalente de admin/helpers/config.php: le a tabela `configuracoes` (chave/valor por loja). */
export async function getConfig(lojaId: number, chave: string, padrao = ""): Promise<string> {
  const linhas = await db
    .select({ valor: configuracoes.valor })
    .from(configuracoes)
    .where(and(eq(configuracoes.chave, chave), eq(configuracoes.loja_id, lojaId)))
    .limit(1);
  return linhas[0]?.valor ?? padrao;
}

/** Busca varias chaves de uma vez (uma unica ida ao banco). */
export async function getConfigs(lojaId: number, chaves: string[]): Promise<Record<string, string>> {
  const linhas = await db
    .select({ chave: configuracoes.chave, valor: configuracoes.valor })
    .from(configuracoes)
    .where(eq(configuracoes.loja_id, lojaId));
  const mapa: Record<string, string> = {};
  for (const l of linhas) mapa[l.chave] = l.valor;
  const resultado: Record<string, string> = {};
  for (const c of chaves) resultado[c] = mapa[c] ?? "";
  return resultado;
}
