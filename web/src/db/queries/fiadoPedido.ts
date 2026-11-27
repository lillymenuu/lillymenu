import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { NeonTx } from "@/db";
import { clientes, fiadoLancamentos } from "@/db/schema";
import { timestampLoja } from "@/db/queries/tempo";

/*
 * Fiado ligado a um pedido. Um pedido com forma de pagamento "fiado" lanca uma "venda" no fiado do
 * cliente (pdvSalvar). Se o pedido e cancelado (ou editado e recriado), esse valor precisa sair do
 * saldo do cliente: registramos um lancamento "estorno" (nao "pagamento", que o caixa e os relatorios
 * contam como dinheiro recebido) e baixamos clientes.saldo_fiado.
 */

/** Fiado ainda em aberto deste pedido: vendas lancadas menos estornos ja feitos. */
export async function fiadoLiquidoDoPedido(tx: NeonTx, lojaId: number, pedidoId: number): Promise<{ clienteId: number | null; valor: number }> {
  const [linha] = await tx
    .select({
      clienteId: sql<number | null>`max(${fiadoLancamentos.cliente_id})`,
      vendas: sql<string>`coalesce(sum(${fiadoLancamentos.valor}) filter (where ${fiadoLancamentos.tipo} = 'venda'), 0)`,
      estornos: sql<string>`coalesce(sum(${fiadoLancamentos.valor}) filter (where ${fiadoLancamentos.tipo} = 'estorno'), 0)`,
    })
    .from(fiadoLancamentos)
    .where(and(eq(fiadoLancamentos.loja_id, lojaId), eq(fiadoLancamentos.pedido_id, pedidoId)));
  const valor = Math.round((Number(linha?.vendas ?? 0) - Number(linha?.estornos ?? 0)) * 100) / 100;
  return { clienteId: linha?.clienteId ?? null, valor };
}

/** Devolve ao cliente o fiado em aberto do pedido (cancelamento/edicao). Nao faz nada se nao houver. */
export async function estornarFiadoDoPedido(tx: NeonTx, lojaId: number, pedidoId: number, operadorId: number | null, motivo: string): Promise<void> {
  const { clienteId, valor } = await fiadoLiquidoDoPedido(tx, lojaId, pedidoId);
  if (!clienteId || valor <= 0.009) return;

  const [c] = await tx.select({ saldo: clientes.saldo_fiado }).from(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId))).limit(1);
  const saldoAntes = Number(c?.saldo ?? 0);
  const saldoDepois = Math.max(0, Math.round((saldoAntes - valor) * 100) / 100);

  await tx.update(clientes).set({ saldo_fiado: saldoDepois }).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)));
  await tx.insert(fiadoLancamentos).values({
    criado_em: await timestampLoja(lojaId),
    loja_id: lojaId,
    cliente_id: clienteId,
    pedido_id: pedidoId,
    operador_id: operadorId,
    tipo: "estorno",
    valor,
    saldo_antes: saldoAntes,
    saldo_depois: saldoDepois,
    observacao: motivo,
  });
}
