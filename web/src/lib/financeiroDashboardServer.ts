import "server-only";
import { detalheDashboardFinanceiro } from "@/db/queries/financeiroRelatorios";
import type { FinanceiroDashboardResposta } from "@/lib/financeiroDashboard";

export async function getFinanceiroDashboard(lojaId: number, mes?: number, ano?: number): Promise<FinanceiroDashboardResposta> {
  const resultado = await detalheDashboardFinanceiro(lojaId, mes, ano);

  return {
    ok: true,
    mes: resultado.mes,
    ano: resultado.ano,
    anos: resultado.anos,
    resumo_mensal: {
      reference_month: resultado.resumoMensal.referenceMonth,
      reference_year: resultado.resumoMensal.referenceYear,
      total_income: resultado.resumoMensal.totalIncome,
      total_expense: resultado.resumoMensal.totalExpense,
      profit_or_loss: resultado.resumoMensal.profitOrLoss,
      margin_percent: resultado.resumoMensal.marginPercent,
    },
    dashboard: {
      summary: { total_income: resultado.dashboard.summary.totalIncome, total_expense: resultado.dashboard.summary.totalExpense, balance: resultado.dashboard.summary.balance },
      cash_flow: resultado.dashboard.cashFlow.map((c) => ({ transaction_date: c.transactionDate, income_total: c.incomeTotal, expense_total: c.expenseTotal, day_balance: c.dayBalance })),
      accounts: resultado.dashboard.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        initial_balance: a.initialBalance,
        active: a.active ? 1 : 0,
        monthly_income: a.monthlyIncome,
        monthly_expense: a.monthlyExpense,
        monthly_balance: a.monthlyBalance,
      })),
      expense_by_category: resultado.dashboard.expenseByCategory.map((c) => ({ category_name: c.categoryName, category_group: c.categoryGroup, total: c.total })),
      income_by_payment_method: resultado.dashboard.incomeByPaymentMethod.map((p) => ({ payment_method: p.paymentMethod, total: p.total })),
    },
    dre: {
      gross_revenue: resultado.dre.grossRevenue,
      total_expenses: resultado.dre.totalExpenses,
      net_profit: resultado.dre.netProfit,
      margin_percent: resultado.dre.marginPercent,
      lines: resultado.dre.lines.map((l) => ({ type: l.type, category_name: l.categoryName, group_name: l.groupName, total: l.total })),
    },
  };
}
