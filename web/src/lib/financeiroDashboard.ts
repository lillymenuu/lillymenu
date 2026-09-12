export type FinanceiroConta = {
  id: number;
  name: string;
  initial_balance: string;
  active: number;
  monthly_income: string;
  monthly_expense: string;
  monthly_balance: string;
};

export type FinanceiroPorPagamento = { payment_method: string; total: string };
export type FinanceiroPorCategoria = { category_name: string; category_group: string | null; total: string };

export type FinanceiroDashboardResposta = {
  ok: true;
  mes: number;
  ano: number;
  anos: number[];
  resumo_mensal: {
    reference_month: number;
    reference_year: number;
    total_income: number;
    total_expense: number;
    profit_or_loss: number;
    margin_percent: number;
  };
  dashboard: {
    summary: { total_income: string; total_expense: string; balance: string };
    cash_flow: { transaction_date: string; income_total: string; expense_total: string; day_balance: string }[];
    accounts: FinanceiroConta[];
    expense_by_category: FinanceiroPorCategoria[];
    income_by_payment_method: FinanceiroPorPagamento[];
  };
  dre: {
    gross_revenue: number;
    total_expenses: number;
    net_profit: number;
    margin_percent: number;
    lines: { type: string; category_name: string; group_name: string; total: string }[];
  };
};

export const MESES_LABEL: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Março",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

export const DONUT_CORES = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#9C5523", "#14b8a6"];
export const DESPESA_COR = "#ef4444";
