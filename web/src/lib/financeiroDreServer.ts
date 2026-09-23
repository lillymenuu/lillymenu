import "server-only";
import { detalheDreFinanceiro } from "@/db/queries/financeiroRelatorios";
import type { FinanceiroDreResposta, FinanceiroDreMes } from "@/lib/financeiroDre";

export async function getFinanceiroDre(lojaId: number, ano?: number): Promise<FinanceiroDreResposta> {
  const resultado = await detalheDreFinanceiro(lojaId, ano);
  const meses: Record<string, FinanceiroDreMes> = {};
  for (const [mes, r] of Object.entries(resultado.meses)) {
    meses[mes] = { reference_month: r.referenceMonth, reference_year: r.referenceYear, total_income: r.totalIncome, total_expense: r.totalExpense, profit_or_loss: r.profitOrLoss, margin_percent: r.marginPercent };
  }
  return { ok: true, ano: resultado.ano, anos: resultado.anos, meses };
}
