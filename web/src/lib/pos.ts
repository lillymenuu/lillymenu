export type PosCategoria = { id: number; nome: string };

export type PosProduto = {
  id: number;
  nome: string;
  categoria_id: number | null;
  preco: number;
  preco_promocional: number | null;
  tem_variacoes: boolean;
  imagem: string | null;
  pontos_ganho: number;
  pontos_custo: number;
  estoque: number;
};

export type PosCombo = {
  id: number;
  nome: string;
  categoria_id: number | null;
  imagem: string | null;
  tipo_preco: string;
  preco: number;
  preco_promocional: number | null;
};

export type PosCatalogoResposta = {
  ok: true;
  categorias: PosCategoria[];
  produtos: PosProduto[];
  combos: PosCombo[];
};

export type PosVariacao = {
  id: number;
  tamanho: string | null;
  cor: string | null;
  preco: number;
};

export type PosExtra = { id: number; nome: string; preco: number; obrigatorio: number };

export type PosVariacoesResposta = {
  ok: boolean;
  msg?: string;
  variacoes: PosVariacao[];
  extras: PosExtra[];
  extras_obrigatorio: number;
  complementos_itens: PosExtra[];
  complementos_itens_obrigatorio: number;
};

export type PosComboOpcao = {
  id: number;
  nome: string;
  preco: number;
  imagem: string | null;
  estoque: number | null;
  esgotado: boolean;
};

export type PosComboPasso = {
  id: number;
  nome: string;
  min_itens: number;
  max_itens: number;
  obrigatorio: boolean;
  permite_repetir: boolean;
  opcoes: PosComboOpcao[];
};

export type PosComboDetalheResposta = {
  ok: boolean;
  msg?: string;
  combo?: { id: number; nome: string; preco: number; tipo_preco: string };
  passos?: PosComboPasso[];
};

export type PosCartComboSel = { id: number; nome: string; qtd: number };

export type PosCartItem = {
  rowKey: string;
  produtoId: number | null;
  comboId?: number | null;
  nome: string;
  qtd: number;
  preco: number;
  observacoes: string;
  usarPontos: boolean;
  combosels?: PosCartComboSel[];
  imagem?: string | null;
  estoque?: number;
};

export type PosClienteBusca = { id: number; nome: string; telefone: string };

export type PosClienteEndereco = {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
  cep: string;
};

export type PosClienteStats = {
  ok: boolean;
  nome?: string;
  telefone?: string;
  cashback?: number;
  pontos?: number;
  saldo_fiado?: number;
  pedidos_feitos?: number;
  endereco?: PosClienteEndereco;
};

export type PosTipoPedido = "entrega" | "retirada" | "mesa";

export type PosFormaPagamento = "dinheiro" | "credito" | "debito" | "pix" | "voucher" | "fiado";

export type PosPagamentoLinha = { forma: PosFormaPagamento; valor: number };

export type PosCupomValidado = {
  ok: boolean;
  msg?: string;
  codigo?: string;
  tipo?: "valor" | "percent" | "frete";
  desconto?: number;
  valor?: number;
};

export type PosSalvarResposta = { ok: true; pedido_id: string | number; tipo: string } | { ok: false; msg: string };

export type PosCepLookupResposta =
  | {
      ok: true;
      cep: string;
      logradouro: string;
      bairro: string;
      cidade: string;
      estado: string;
      distancia_km: number;
      taxa_entrega: number;
    }
  | { ok: false; msg: string };
