import "server-only";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { impressaoFila, pedidos } from "@/db/schema";
import { listarImpressorasLoja } from "@/db/queries/impressoras";

/*
 * Fila de impressao entre computadores da loja. Quem pede cria um trabalho por impressora;
 * o computador que tem a impressora vinculada pega (pendente -> imprimindo), imprime e conclui.
 * Trabalho pendente vale por pouco tempo: se nenhum computador pegar, nao imprime "do nada" depois.
 */
const VALIDADE_SEGUNDOS = 60;

export type TrabalhoImpressao = { id: number; pedido_id: number; perfil_id: string; status: string; erro: string | null };

export async function criarTrabalhosImpressao(lojaId: number, pedidoId: number, perfilIds: string[]) {
  const [pedido] = await db
    .select({ id: pedidos.id })
    .from(pedidos)
    .where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId)))
    .limit(1);
  if (!pedido) return { ok: false as const, msg: "Pedido não encontrado." };

  const daLoja = new Set((await listarImpressorasLoja(lojaId)).map((p) => p.id));
  const ids = [...new Set(perfilIds)].filter((id) => daLoja.has(id)).slice(0, 10);
  if (!ids.length) return { ok: false as const, msg: "Nenhuma impressora da loja selecionada." };

  // limpeza: historico da fila so interessa por pouco tempo
  await db.delete(impressaoFila).where(and(eq(impressaoFila.loja_id, lojaId), lt(impressaoFila.criado_em, sql`now() - interval '1 day'`)));

  const criados = await db
    .insert(impressaoFila)
    .values(ids.map((perfil_id) => ({ loja_id: lojaId, pedido_id: pedidoId, perfil_id })))
    .returning({ id: impressaoFila.id });
  return { ok: true as const, ids: criados.map((c) => c.id) };
}

export async function statusTrabalhosImpressao(lojaId: number, ids: number[]): Promise<TrabalhoImpressao[]> {
  if (!ids.length) return [];
  return db
    .select({
      id: impressaoFila.id,
      pedido_id: impressaoFila.pedido_id,
      perfil_id: impressaoFila.perfil_id,
      status: impressaoFila.status,
      erro: impressaoFila.erro,
    })
    .from(impressaoFila)
    .where(and(eq(impressaoFila.loja_id, lojaId), inArray(impressaoFila.id, ids)));
}

/* Desiste dos que ninguem pegou (os que ja estao imprimindo seguem). */
export async function cancelarTrabalhosPendentes(lojaId: number, ids: number[]) {
  if (!ids.length) return;
  await db
    .update(impressaoFila)
    .set({ status: "cancelado", atualizado_em: sql`now()` })
    .where(and(eq(impressaoFila.loja_id, lojaId), inArray(impressaoFila.id, ids), eq(impressaoFila.status, "pendente")));
}

/* Pega (de forma atomica) os pendentes das impressoras vinculadas no computador que pergunta. */
export async function pegarTrabalhosImpressao(lojaId: number, perfilIds: string[]): Promise<TrabalhoImpressao[]> {
  const ids = [...new Set(perfilIds)].filter(Boolean).slice(0, 20);
  if (!ids.length) return [];
  const lista = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `
  );
  const res = await db.execute(sql`
    UPDATE impressao_fila SET status = 'imprimindo', atualizado_em = now()
    WHERE id IN (
      SELECT id FROM impressao_fila
      WHERE loja_id = ${lojaId} AND status = 'pendente' AND perfil_id IN (${lista})
        AND criado_em > now() - make_interval(secs => ${VALIDADE_SEGUNDOS})
      ORDER BY id
      LIMIT 5
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, pedido_id, perfil_id, status, erro
  `);
  return (res.rows as TrabalhoImpressao[]).map((r) => ({ ...r, id: Number(r.id), pedido_id: Number(r.pedido_id) }));
}

export async function concluirTrabalhoImpressao(lojaId: number, id: number, ok: boolean, erro?: string) {
  await db
    .update(impressaoFila)
    .set({ status: ok ? "impresso" : "erro", erro: ok ? null : (erro || "Erro ao imprimir.").slice(0, 255), atualizado_em: sql`now()` })
    .where(and(eq(impressaoFila.loja_id, lojaId), eq(impressaoFila.id, id), eq(impressaoFila.status, "imprimindo")));
}
