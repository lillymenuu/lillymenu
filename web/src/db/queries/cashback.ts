import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import type { NeonTx } from "@/db";
import { clientes, pedidos, cashbackMovimentacoes } from "@/db/schema";
import { getConfig, getConfigs } from "@/db/queries/config";
import { apenasDigitos, telefoneSemMascara } from "@/db/queries/telefone";
import { adicionarDiasFortaleza, adicionarHorasFortaleza } from "@/db/queries/tempo";

type Queryable = typeof db | NeonTx;

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

/*
 * Equivalente de admin/helpers/cashback_module.php (cashbackPromoverPendente/
 * cashbackCancelarPendente): pedidoCriar.ts grava o cashback do pedido como
 * 'pendente' na hora da compra (sem creditar ainda); essas duas funcoes fecham
 * o ciclo na troca de status — promovem pra credito real ('entrada', com
 * carencia/expiracao) na finalizacao, ou descartam no cancelamento. Idempotente
 * (checa se ja foi creditado antes de promover de novo) e best-effort (nunca
 * lanca — nao pode derrubar a troca de status do pedido).
 */
export async function cashbackPromoverPendente(conexao: Queryable, lojaId: number, pedidoId: number): Promise<void> {
  try {
    const [pedido] = await conexao.select({ clienteId: pedidos.cliente_id }).from(pedidos).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId))).limit(1);
    const clienteId = pedido?.clienteId;
    if (!clienteId) return;

    const [{ n: jaCreditado }] = await conexao
      .select({ n: sql<string>`count(*)` })
      .from(cashbackMovimentacoes)
      .where(and(eq(cashbackMovimentacoes.pedido_id, pedidoId), eq(cashbackMovimentacoes.tipo, "entrada"), eq(cashbackMovimentacoes.loja_id, lojaId)));

    if (Number(jaCreditado) === 0) {
      const [{ pendente }] = await conexao
        .select({ pendente: sql<string>`coalesce(sum(${cashbackMovimentacoes.valor}),0)` })
        .from(cashbackMovimentacoes)
        .where(and(eq(cashbackMovimentacoes.pedido_id, pedidoId), eq(cashbackMovimentacoes.tipo, "pendente"), eq(cashbackMovimentacoes.loja_id, lojaId)));
      const pendenteNum = Math.round(Number(pendente) * 100) / 100;

      const cashbackAtivo = (await getConfig(lojaId, "cashback_ativo", "0")) === "1";

      if (pendenteNum > 0.009 && cashbackAtivo) {
        const carenciaHoras = Math.max(0, Number(await getConfig(lojaId, "cashback_carencia_horas", "12")));
        const expiraDias = Number(await getConfig(lojaId, "cashback_expira_dias", "0"));
        const expiraEm = expiraDias > 0 ? adicionarDiasFortaleza(expiraDias) : null;
        const disponivelEm = carenciaHoras > 0 ? adicionarHorasFortaleza(carenciaHoras) : null;

        const [cliente] = await conexao.select({ saldo: clientes.cashback_saldo }).from(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId))).limit(1);
        const saldoAntes = cliente?.saldo ?? 0;
        const saldoDepois = saldoAntes + pendenteNum;

        await conexao.insert(cashbackMovimentacoes).values({ cliente_id: clienteId, pedido_id: pedidoId, tipo: "entrada", valor: pendenteNum, saldo_antes: saldoAntes, saldo_depois: saldoDepois, expira_em: expiraEm, disponivel_em: disponivelEm, referencia_id: null, loja_id: lojaId });
        await conexao.update(clientes).set({ cashback_saldo: sql`greatest(0, ${clientes.cashback_saldo} + ${pendenteNum})` }).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)));
      }
    }

    await conexao.delete(cashbackMovimentacoes).where(and(eq(cashbackMovimentacoes.pedido_id, pedidoId), eq(cashbackMovimentacoes.tipo, "pendente"), eq(cashbackMovimentacoes.loja_id, lojaId)));
  } catch (e) {
    console.error("[cashback] falha ao promover cashback pendente", pedidoId, e);
  }
}

export async function cashbackCancelarPendente(conexao: Queryable, lojaId: number, pedidoId: number): Promise<void> {
  try {
    await conexao.delete(cashbackMovimentacoes).where(and(eq(cashbackMovimentacoes.pedido_id, pedidoId), eq(cashbackMovimentacoes.tipo, "pendente"), eq(cashbackMovimentacoes.loja_id, lojaId)));
  } catch (e) {
    console.error("[cashback] falha ao cancelar cashback pendente", pedidoId, e);
  }
}
