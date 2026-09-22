import "server-only";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL nao configurada (Neon).");
}

/*
 * Consultas simples (leituras e escritas de uma instrucao): HTTP, sem conexao
 * persistente — o melhor encaixe para funcoes serverless do Vercel.
 */
export const db = drizzleHttp(neon(url), { schema });

/*
 * Transacoes (criar pedido, baixar estoque, fechar caixa...): precisam de uma
 * conexao WebSocket. Use `await withTransaction(async (tx) => { ... })`.
 */
neonConfig.poolQueryViaFetch = true;

export async function withTransaction<T>(fn: (tx: Parameters<Parameters<ReturnType<typeof drizzlePool>["transaction"]>[0]>[0]) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: url });
  try {
    const tdb = drizzlePool(pool, { schema });
    return await tdb.transaction((tx) => fn(tx));
  } finally {
    await pool.end();
  }
}

export { schema };
