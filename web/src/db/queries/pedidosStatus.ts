import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import type { NeonTx } from "@/db";
import { pedidos, pedidoStatusLog, clientes, pontosMovimentacoes, operacaoLogs } from "@/db/schema";
import { pedidoRestaurarEstoqueCancelado } from "@/db/queries/pedidoEstoque";
import { caixaAtribuirPedidoFinalizado } from "@/db/queries/caixa";
import { cashbackPromoverPendente, cashbackCancelarPendente } from "@/db/queries/cashback";
import { syncFinalizedOrder, reverseCanceledOrder } from "@/db/queries/financeiroSync";
import { getConfig } from "@/db/queries/config";

/*
 * Equivalente de admin/api/v1/pedidos_status.php, pedidos_cancelar.php e
 * pedidos_finalizar.php: troca de status do pedido, com as cascatas que o
 * legado dispara em cada uma (estoque, cashback, pontos, caixa, financeiro).
 *
 * Diferenca deliberada do legado: la, cada endpoint tinha uma ordenacao
 * diferente entre commit da transacao e as cascatas (pedidos_status.php
 * roda as cascatas DEPOIS do commit; pedidos_cancelar.php e
 * pedidos_finalizar.php rodam ANTES, dentro da mesma transacao) — drift
 * organico entre os tres arquivos, nao uma escolha deliberada. Aqui as
 * tres funcoes rodam a cascata de estoque/cashback/caixa/pontos sempre
 * dentro da MESMA transacao do update de status (mais atomico: uma falha
 * no meio desfaz tudo, inclusive o status). A sincronizacao com o
 * financeiro continua sempre DEPOIS do commit e best-effort (nunca
 * lanca), igual aos tres originais — ela abre suas proprias transacoes
 * por lancamento (financeiroSync.ts) e nao pode ser aninhada aqui.
 */

const STATUS_VALIDOS = ["pendente", "aceito", "preparando", "entrega", "finalizado", "cancelado"] as const;
type StatusPedido = (typeof STATUS_VALIDOS)[number];

async function registrarOperacao(operadorId: number | null, acao: string, referencia: string, dados?: Record<string, unknown>): Promise<void> {
  try {
    await db.insert(operacaoLogs).values({ operador_id: operadorId, acao, referencia, dados: dados ? JSON.stringify(dados) : null });
  } catch {
    // silencia — log nao pode interromper o fluxo principal
  }
}

async function promoverPontosPendentes(tx: NeonTx, lojaId: number, pedidoId: number): Promise<void> {
  const clubePontosAtivo = (await getConfig(lojaId, "clube_pontos_ativo", "0")) === "1";
  if (!clubePontosAtivo) return;

  const [pedido] = await tx.select({ clienteId: pedidos.cliente_id }).from(pedidos).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId))).limit(1);
  const clienteId = pedido?.clienteId;
  if (!clienteId) return;

  const [{ n: jaCred }] = await tx
    .select({ n: sql<string>`count(*)` })
    .from(pontosMovimentacoes)
    .where(and(eq(pontosMovimentacoes.pedido_id, pedidoId), eq(pontosMovimentacoes.tipo, "ganho"), eq(pontosMovimentacoes.loja_id, lojaId)));

  const pendenteLinhas = await tx
    .select({ pontos: pontosMovimentacoes.pontos })
    .from(pontosMovimentacoes)
    .where(and(eq(pontosMovimentacoes.pedido_id, pedidoId), eq(pontosMovimentacoes.tipo, "pendente"), eq(pontosMovimentacoes.loja_id, lojaId)));
  const pendente = pendenteLinhas.reduce((acc, l) => acc + l.pontos, 0);

  if (pendente > 0 && Number(jaCred) === 0) {
    const [cliente] = await tx.select({ saldo: clientes.pontos_saldo }).from(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId))).limit(1);
    const saldoAntes = cliente?.saldo ?? 0;
    const saldoDepois = saldoAntes + pendente;

    await tx.insert(pontosMovimentacoes).values({ cliente_id: clienteId, pedido_id: pedidoId, tipo: "ganho", pontos: pendente, saldo_antes: saldoAntes, saldo_depois: saldoDepois, referencia_id: null, loja_id: lojaId });
    await tx.update(clientes).set({ pontos_saldo: saldoDepois < 0 ? 0 : saldoDepois }).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)));
  }

  if (pendente > 0) {
    await tx.delete(pontosMovimentacoes).where(and(eq(pontosMovimentacoes.pedido_id, pedidoId), eq(pontosMovimentacoes.tipo, "pendente"), eq(pontosMovimentacoes.loja_id, lojaId)));
  }
}

export type ResultadoTrocaStatus = { ok: true } | { ok: false; msg: string };

/** Equivalente de pedidos_status.php: move o pedido entre as colunas do kanban. */
export async function atualizarStatusPedido(lojaId: number, adminId: number, pedidoId: number, status: string): Promise<ResultadoTrocaStatus> {
  if (!pedidoId || !status) return { ok: false, msg: "Pedido e status são obrigatórios." };
  if (!STATUS_VALIDOS.includes(status as StatusPedido)) return { ok: false, msg: "Status inválido." };
  const statusTipado = status as StatusPedido;

  const statusAntes = await withTransaction(async (tx) => {
    const [atual] = await tx.select({ status: pedidos.status }).from(pedidos).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId))).limit(1);
    if (!atual) return null;

    await tx.update(pedidos).set({ status: statusTipado }).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId)));
    await tx.insert(pedidoStatusLog).values({ pedido_id: pedidoId, status: statusTipado, loja_id: lojaId });

    if (statusTipado === "cancelado" && atual.status !== "cancelado") {
      await pedidoRestaurarEstoqueCancelado(tx, pedidoId, lojaId);
      await cashbackCancelarPendente(tx, lojaId, pedidoId);
    } else if (statusTipado === "finalizado") {
      await promoverPontosPendentes(tx, lojaId, pedidoId);
      await cashbackPromoverPendente(tx, lojaId, pedidoId);
      await caixaAtribuirPedidoFinalizado(tx, lojaId, pedidoId);
    }

    return atual.status;
  });

  if (statusAntes === null) return { ok: false, msg: "Pedido não encontrado." };

  try {
    if (statusTipado === "finalizado") await syncFinalizedOrder(lojaId, pedidoId);
    else if (statusTipado === "cancelado") await reverseCanceledOrder(lojaId, pedidoId);
  } catch (e) {
    console.error("Erro ao sincronizar pedido no financeiro:", e);
  }

  await registrarOperacao(adminId, "pedido_status", `pedido:${pedidoId}`, { status: statusTipado });
  return { ok: true };
}

/** Equivalente de pedidos_cancelar.php: botao "Cancelar pedido" no modal de detalhe (so admin/gerente). */
export async function cancelarPedido(lojaId: number, adminId: number, perfil: string, pedidoId: number): Promise<ResultadoTrocaStatus> {
  if (perfil !== "admin" && perfil !== "gerente") return { ok: false, msg: "Sem permissão para cancelar pedidos." };
  if (!pedidoId) return { ok: false, msg: "Pedido inválido." };

  const resultado = await withTransaction(async (tx) => {
    const [atual] = await tx.select({ status: pedidos.status }).from(pedidos).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId))).limit(1);
    if (!atual) return "nao_encontrado" as const;
    if (atual.status === "cancelado") return "ja_cancelado" as const;

    await tx.update(pedidos).set({ status: "cancelado" }).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId)));
    await tx.insert(pedidoStatusLog).values({ pedido_id: pedidoId, status: "cancelado", loja_id: lojaId });
    await pedidoRestaurarEstoqueCancelado(tx, pedidoId, lojaId);
    await cashbackCancelarPendente(tx, lojaId, pedidoId);
    return "cancelado" as const;
  });

  if (resultado === "nao_encontrado") return { ok: false, msg: "Pedido não encontrado." };
  if (resultado === "ja_cancelado") return { ok: true };

  try {
    await reverseCanceledOrder(lojaId, pedidoId);
  } catch (e) {
    console.error("Erro ao reverter pedido cancelado no financeiro:", e);
  }
  await registrarOperacao(adminId, "pedido_cancelado", `pedido:${pedidoId}`);
  return { ok: true };
}

/** Equivalente de pedidos_finalizar.php: botao "Finalizar" do card e do modal de detalhe. */
export async function finalizarPedido(lojaId: number, adminId: number, pedidoId: number): Promise<ResultadoTrocaStatus> {
  if (!pedidoId) return { ok: false, msg: "Pedido inválido." };

  const encontrado = await withTransaction(async (tx) => {
    const [atual] = await tx.select({ id: pedidos.id }).from(pedidos).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId))).limit(1);
    if (!atual) return false;

    await tx.update(pedidos).set({ status: "finalizado" }).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId)));
    await tx.insert(pedidoStatusLog).values({ pedido_id: pedidoId, status: "finalizado", loja_id: lojaId });

    await promoverPontosPendentes(tx, lojaId, pedidoId);
    await cashbackPromoverPendente(tx, lojaId, pedidoId);
    await caixaAtribuirPedidoFinalizado(tx, lojaId, pedidoId);
    return true;
  });

  if (!encontrado) return { ok: false, msg: "Pedido não encontrado." };

  try {
    await syncFinalizedOrder(lojaId, pedidoId);
  } catch (e) {
    console.error("Erro ao sincronizar pedido finalizado no financeiro:", e);
  }
  await registrarOperacao(adminId, "pedido_finalizado", `pedido:${pedidoId}`);
  return { ok: true };
}
