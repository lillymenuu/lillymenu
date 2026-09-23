import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { operacaoLogs, pedidos, clientes, avaliacoes } from "@/db/schema";
import { pedidoCodigoBase, codigoDisplay } from "@/db/queries/pedidosAdmin";
import { dataFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/notificacoes_pedidos.php: pedidos novos/editados
 * de hoje + avaliacoes de hoje, combinados e ordenados — sino de notificacoes
 * do admin.
 */

export type NotificacaoPedido = {
  id: number;
  codigo: number;
  criadoEm: string;
  cliente: string;
  status: string | null;
  origem: string | null;
  tipo: "novo" | "editado" | "avaliacao";
  chave: string;
  nota?: number;
  pedidoId?: number;
};

export async function notificacoesPedidos(lojaId: number): Promise<NotificacaoPedido[]> {
  const hoje = dataFortaleza();

  // pedidos editados hoje: operacao_logs.acao='pedido_editado', dados.novo_pedido é o id do pedido.
  const logsHoje = await db
    .select({ dados: operacaoLogs.dados })
    .from(operacaoLogs)
    .where(and(eq(operacaoLogs.acao, "pedido_editado"), sql`${operacaoLogs.criado_em}::date = ${hoje}::date`));

  const editados = new Set<number>();
  for (const l of logsHoje) {
    if (!l.dados) continue;
    try {
      const payload = JSON.parse(l.dados) as Record<string, unknown>;
      const novoPedido = Number(payload.novo_pedido ?? 0);
      if (novoPedido > 0) editados.add(novoPedido);
    } catch {
      // ignora payload invalido
    }
  }

  const pedidosHoje = await db
    .select({ id: pedidos.id, criadoEm: pedidos.criado_em, cliente: clientes.nome, status: pedidos.status, origem: pedidos.origem })
    .from(pedidos)
    .leftJoin(clientes, eq(clientes.id, pedidos.cliente_id))
    .where(and(eq(pedidos.loja_id, lojaId), sql`${pedidos.criado_em}::date = ${hoje}::date`))
    .orderBy(sql`${pedidos.criado_em} desc`, sql`${pedidos.id} desc`)
    .limit(50);

  const base = await pedidoCodigoBase(lojaId);

  const resultado: NotificacaoPedido[] = pedidosHoje.map((p) => ({
    id: p.id,
    codigo: codigoDisplay(p.id, base),
    criadoEm: p.criadoEm ?? "",
    cliente: p.cliente || "Cliente",
    status: p.status,
    origem: p.origem,
    tipo: editados.has(p.id) ? "editado" : "novo",
    chave: `pedido-${p.id}`,
  }));

  const avaliacoesHoje = await db
    .select({ id: avaliacoes.id, nota: avaliacoes.nota, criadoEm: avaliacoes.criado_em, pedidoId: avaliacoes.pedido_id, cliente: clientes.nome })
    .from(avaliacoes)
    .leftJoin(clientes, and(eq(clientes.id, avaliacoes.cliente_id), eq(clientes.loja_id, avaliacoes.loja_id)))
    .where(and(eq(avaliacoes.loja_id, lojaId), sql`${avaliacoes.criado_em}::date = ${hoje}::date`))
    .orderBy(sql`${avaliacoes.criado_em} desc`, sql`${avaliacoes.id} desc`)
    .limit(50);

  for (const av of avaliacoesHoje) {
    resultado.push({
      id: av.id,
      codigo: codigoDisplay(av.pedidoId, base),
      criadoEm: av.criadoEm,
      cliente: av.cliente || "Cliente",
      status: null,
      origem: null,
      tipo: "avaliacao",
      chave: `avaliacao-${av.id}`,
      nota: av.nota,
      pedidoId: av.pedidoId,
    });
  }

  resultado.sort((a, b) => (b.criadoEm ?? "").localeCompare(a.criadoEm ?? ""));

  return resultado;
}
