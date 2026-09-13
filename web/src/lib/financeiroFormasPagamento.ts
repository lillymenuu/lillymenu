export type FinanceiroFormaPagamento = {
  id: number;
  name: string;
  active: boolean;
};

export type FinanceiroFormasPagamentoResposta = {
  ok: true;
  formas_pagamento: FinanceiroFormaPagamento[];
};
