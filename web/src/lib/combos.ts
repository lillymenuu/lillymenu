export type ComboTipoPreco = "por_combo" | "por_item";

export type Combo = {
  id: number;
  nome: string;
  imagem: string | null;
  categoria_id: number | null;
  tipo_preco: ComboTipoPreco;
  preco: number;
  preco_promocional: number | null;
  promo_desativado: number;
  ativo: number;
};

export type ComboPassoOpcao = {
  id: number;
  nome: string;
  preco: number | string;
  imagem: string | null;
  estoque: number;
  esgotado: boolean;
};

export type ComboPasso = {
  id: number;
  nome: string;
  descricao: string | null;
  obrigatorio: number;
  min_itens: number;
  max_itens: number;
  permite_repetir: number;
  opcoes: ComboPassoOpcao[];
};

export type ComboDetalhe = {
  id: number;
  nome: string;
  descricao: string | null;
  imagem: string | null;
  tipo_preco: ComboTipoPreco;
  preco: number | string;
  preco_promocional: number | string | null;
  promo_desativado: number;
  ativo: number;
  categoria_id: number | null;
};

export type CombosListarResposta = {
  ok: true;
  combos: Combo[];
};

export type ComboDetalheResposta = {
  ok: true;
  combo: ComboDetalhe;
  passos: ComboPasso[];
};

export type ComboSalvarResposta = {
  ok: true;
  combo_id: number;
};

export type ComboPassoSalvarResposta = {
  ok: true;
  passo_id: number;
};
