export type CrossSellGrupo = {
  categoria: string;
  total_produtos: number;
  exemplos: string[];
};

export type CrossSellStatusResposta = {
  ok: true;
  ativo: boolean;
  faturamento_extra: number;
  grupos: CrossSellGrupo[];
};
