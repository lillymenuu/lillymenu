export type FinanceiroConta = {
  id: number;
  name: string;
  initial_balance: number;
  current_balance: number;
  active: boolean;
};

export type FinanceiroContasResposta = {
  ok: true;
  contas: FinanceiroConta[];
};
