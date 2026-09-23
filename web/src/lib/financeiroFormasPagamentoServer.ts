import "server-only";
import { listarFormasPagamento } from "@/db/queries/financeiroCore";
import type { FinanceiroFormasPagamentoResposta } from "@/lib/financeiroFormasPagamento";

export async function getFinanceiroFormasPagamento(lojaId: number): Promise<FinanceiroFormasPagamentoResposta> {
  const formas = await listarFormasPagamento(lojaId, false);
  return { ok: true, formas_pagamento: formas.map((f) => ({ id: f.id, name: f.name, active: f.active })) };
}
