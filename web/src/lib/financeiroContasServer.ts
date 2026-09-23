import "server-only";
import { listarContasFinanceiras } from "@/db/queries/financeiroCore";
import type { FinanceiroContasResposta } from "@/lib/financeiroContas";

export async function getFinanceiroContas(lojaId: number): Promise<FinanceiroContasResposta> {
  const contas = await listarContasFinanceiras(lojaId, false);
  return {
    ok: true,
    contas: contas.map((c) => ({ id: c.id, name: c.name, initial_balance: c.initialBalance, current_balance: c.currentBalance, active: c.active })),
  };
}
