import "server-only";
import { and, eq, gte, lt } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { pdvReservas } from "@/db/schema";
import { membrosDoGrupo } from "@/db/queries/estoqueVinculo";

/*
 * Equivalente de admin/helpers/pdv_reserva_module.php: unidades que o balcao
 * (PDV) ja separou no carrinho, ainda dentro do TTL de 90s, precisam sair do
 * estoque exibido/checado na loja publica. Produtos vinculados ao mesmo grupo
 * de estoque enxergam a soma das reservas do grupo inteiro (dividem o mesmo
 * saldo fisico) — ver membrosDoGrupo.
 */
const TTL_MS = 90_000;

/** Mapa produto_id -> quantidade reservada, ja com a propagacao por grupo de estoque. */
export async function reservaMapaPdv(lojaId: number): Promise<Map<number, number>> {
  const limite = new Date(Date.now() - TTL_MS).toISOString();
  const linhas = await db
    .select({ produtoId: pdvReservas.produto_id, qtd: pdvReservas.quantidade })
    .from(pdvReservas)
    .where(and(eq(pdvReservas.loja_id, lojaId), gte(pdvReservas.atualizado_em, limite)));

  const bruto = new Map<number, number>();
  for (const l of linhas) {
    bruto.set(l.produtoId, (bruto.get(l.produtoId) ?? 0) + l.qtd);
  }
  if (bruto.size === 0) return bruto;

  const mapa = new Map<number, number>();
  const gruposPorChave = new Map<string, { membros: number[]; qtd: number }>();

  for (const [pid, q] of bruto) {
    const membros = await membrosDoGrupo(db, pid, lojaId);
    if (membros.length <= 1) {
      mapa.set(pid, (mapa.get(pid) ?? 0) + q);
      continue;
    }
    const chave = [...membros].sort((a, b) => a - b).join(",");
    const atual = gruposPorChave.get(chave) ?? { membros, qtd: 0 };
    atual.qtd += q;
    gruposPorChave.set(chave, atual);
  }
  for (const grupo of gruposPorChave.values()) {
    for (const m of grupo.membros) {
      mapa.set(m, Math.max(mapa.get(m) ?? 0, grupo.qtd));
    }
  }
  return mapa;
}

export function aplicarReservaPdv(estoque: number, produtoId: number, mapa: Map<number, number>): number {
  return Math.max(0, estoque - (mapa.get(produtoId) ?? 0));
}

/**
 * Substitui o que a sessao (uma aba de PDV) reserva. itens = Map produto_id -> quantidade.
 * Mapa vazio libera tudo. Reenviar o mesmo conteudo so renova o "ponto" (atualizado_em).
 */
export async function salvarReservaPdv(lojaId: number, sessao: string, itens: Map<number, number>): Promise<void> {
  await withTransaction(async (tx) => {
    const limite = new Date(Date.now() - TTL_MS).toISOString();
    await tx.delete(pdvReservas).where(and(eq(pdvReservas.loja_id, lojaId), lt(pdvReservas.atualizado_em, limite)));
    await tx.delete(pdvReservas).where(and(eq(pdvReservas.loja_id, lojaId), eq(pdvReservas.sessao, sessao)));

    const agora = new Date().toISOString();
    for (const [produtoId, qtd] of itens) {
      if (produtoId > 0 && qtd > 0) {
        await tx.insert(pdvReservas).values({ loja_id: lojaId, sessao, produto_id: produtoId, quantidade: qtd, atualizado_em: agora });
      }
    }
  });
}
