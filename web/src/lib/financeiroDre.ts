export type FinanceiroDreMes = {
  reference_month: number;
  reference_year: number;
  total_income: number;
  total_expense: number;
  profit_or_loss: number;
  margin_percent: number;
};

export type FinanceiroDreResposta = {
  ok: true;
  ano: number;
  anos: number[];
  meses: Record<string, FinanceiroDreMes>;
};

export const MESES_ABREV: Record<number, string> = {
  1: "Jan",
  2: "Fev",
  3: "Mar",
  4: "Abr",
  5: "Mai",
  6: "Jun",
  7: "Jul",
  8: "Ago",
  9: "Set",
  10: "Out",
  11: "Nov",
  12: "Dez",
};
