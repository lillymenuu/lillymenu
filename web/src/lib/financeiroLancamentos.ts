export type FinanceiroCategoriaOpcao = { id: number; name: string; type: "income" | "expense" };
export type FinanceiroContaOpcao = { id: number; name: string };
export type FinanceiroFormaPagamentoOpcao = { id: number; name: string };

export type FinanceiroLancamento = {
  id: number;
  type: "income" | "expense";
  description: string;
  amount: number;
  transaction_date: string;
  reference_month: number;
  reference_year: number;
  notes: string | null;
  account_id: number;
  account_name: string | null;
  category_id: number;
  category_name: string | null;
  payment_method_id: number | null;
  payment_method_name: string | null;
  order_id: number | null;
};

export type FinanceiroLancamentosResposta = {
  ok: true;
  mes: number;
  ano: number;
  anos: number[];
  tipo: string;
  categoria_id: number;
  conta_id: number;
  page: number;
  per_page: number;
  total: number;
  total_paginas: number;
  lancamentos: FinanceiroLancamento[];
  categorias: FinanceiroCategoriaOpcao[];
  contas: FinanceiroContaOpcao[];
  formas_pagamento: FinanceiroFormaPagamentoOpcao[];
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
