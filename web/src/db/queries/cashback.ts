import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { getConfigs } from "@/db/queries/config";
import { apenasDigitos, telefoneSemMascara } from "@/db/queries/telefone";

/*
 * Equivalente de public/api/cashback_check.php: saldo de cashback disponivel
 * pra um telefone, ja descontando o que ainda esta em carencia.
 */

/** Saldo de cashback ja liberado (fora do periodo de carencia) — mesma regra usada na criacao do pedido. */
export async function saldoCashbackLiberado(clienteId: number, lojaId: number, saldoAtual: number): Promise<number> {
  const agora = new Date().toISOString();
  const hoje = agora.slice(0, 10);

  const naoLiberadas = await db.execute<{ valor: string; usado: string }>(sql`
    SELECT m.valor,
      COALESCE((
        SELECT SUM(u.valor) FROM cashback_movimentacoes u
        WHERE u.referencia_id = m.id AND u.tipo IN ('uso','resgate','expirado') AND u.loja_id = m.loja_id
      ), 0) AS usado
    FROM cashback_movimentacoes m
    WHERE m.cliente_id = ${clienteId} AND m.loja_id = ${lojaId} AND m.tipo IN ('entrada','ganho')
      AND m.disponivel_em IS NOT NULL
      AND m.disponivel_em > ${agora}
      AND (m.expira_em IS NULL OR m.expira_em >= ${hoje})
  `);

  let totalNaoLiberado = 0;
  for (const row of naoLiberadas.rows) {
    const d = Number(row.valor) - Number(row.usado);
    if (d > 0) totalNaoLiberado += d;
  }
  return Math.max(0, Math.min(saldoAtual, saldoAtual - totalNaoLiberado));
}

export type CashbackCheckResultado =
  | { ok: true; ativo: false }
  | { ok: true; ativo: true; saldo: number; saldoTotal: number; pct: number; clienteId?: number };

export async function checarCashback(lojaId: number, telefoneBruto: string): Promise<CashbackCheckResultado> {
  const cfg = await getConfigs(lojaId, ["cashback_percentual", "cashback_ativo"]);
  const pct = Number(cfg.cashback_percentual || "0");
  const ativo = cfg.cashback_ativo === "1";

  if (!ativo) return { ok: true, ativo: false };

  const telefone = apenasDigitos(telefoneBruto);
  const linhas = await db
    .select({ id: clientes.id, saldo: clientes.cashback_saldo })
    .from(clientes)
    .where(and(eq(clientes.loja_id, lojaId), or(eq(telefoneSemMascara, telefone), eq(clientes.telefone, telefone))))
    .limit(1);

  if (linhas.length === 0) return { ok: true, ativo: true, saldo: 0, saldoTotal: 0, pct };

  const saldo = Math.max(0, linhas[0].saldo);
  const saldoLiberado = saldo > 0 ? await saldoCashbackLiberado(linhas[0].id, lojaId, saldo) : 0;

  return { ok: true, ativo: true, saldo: saldoLiberado, saldoTotal: saldo, pct, clienteId: linhas[0].id };
}
