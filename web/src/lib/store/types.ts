export type StorePerfil = {
  loja_id: number;
  nomeLoja: string;
  lojaVerificada: boolean;
  lojaAtiva: boolean;
  slug: string;
  lojaCanonicalUrl: string;
  descLoja: string;
  capaLoja: string;
  perfilLoja: string;
  lojaFlyers: string[];
  flyersAtivo: boolean;
  taxaEntrega: number;
  pedidoMin: number;
  pedidoMinEntregaAtivo: boolean;
  pedidoMinEntrega: number;
  pedidoMinRetiradaAtivo: boolean;
  pedidoMinRetirada: number;
  pedidoMinExibir: number;
  tEntMin: number;
  tEntMax: number;
  tRetMin: number;
  tRetMax: number;
  pixAtivo: boolean;
  pixChave: string;
  pixNome: string;
  dinAtivo: boolean;
  credAtivo: boolean;
  debAtivo: boolean;
  bandeirasCredito: string[];
  bandeirasDebito: string[];
  entAtiva: boolean;
  retAtiva: boolean;
  taxasBairro: Record<string, number>;
  taxaEntregaTipo: "fixa" | "bairro" | "dinamica";
  taxaEntregaGratis: boolean;
  clubePontosAtivo: boolean;
  temaCorMenu: string;
  cashbackPct: number;
  cashbackAtivo: boolean;
  cuponsAtivo: boolean;
  avaliacaoMedia: number;
  avaliacaoTotal: number;
  lojaAberta: boolean;
  pausaAtivaTitulo: string;
  pausaAtivaFim: string;
  proximoHorario: string;
  lojaContato: string;
  lojaInstagram: string;
  lojaTiktok: string;
  lojaRua: string;
  lojaNumero: string;
  lojaBairro: string;
  lojaCidade: string;
  lojaEstado: string;
  lojaCep: string;
  enderecoLoja: string;
  catalogoVersao: string;
  mesaId: number | null;
  mesaNome: string | null;
  cupomPreenchido: string | null;
  semanaHorarios: StoreHorarioDia[];
};

export type StoreHorarioDia = {
  dia: string;
  hoje: boolean;
  aberto: boolean;
  inicio: string;
  fim: string;
  fechaBreve: boolean;
};

export type StoreProduto = {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  preco_produto: number;
  preco_base: number;
  preco_final: number;
  em_promo: boolean;
  desc_pct: number;
  imagem: string;
  promo_imagem?: string | null;
  promo_descricao?: string | null;
  promo_etiqueta?: string | null;
  estoque: number;
  esgotado: boolean;
  tem_variacoes: 0 | 1;
  quantidade_minima?: number;
  destaque?: number;
};

export type StoreCombo = {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  preco_base: number;
  preco_final: number;
  em_promo: boolean;
  desc_pct: number;
  imagem: string;
  tipo: "combo";
};

export type StoreCategoria = {
  id: number;
  nome: string;
  modo_exibicao: "vertical" | "horizontal" | "grid";
};

export type StoreCatalogo = {
  loja_id: number;
  categorias: StoreCategoria[];
  produtosPorCat: Record<string, StoreProduto[]>;
  combosPorCat: Record<string, StoreCombo[]>;
  destaques: (StoreProduto | StoreCombo)[];
  produtosEmPromo: StoreProduto[];
  promoAutoPopup: StoreProduto | null;
};

export type StoreVariacao = { id: number; tamanho: string; cor: string; preco: number };
export type StoreExtraItem = { id: number; nome: string; preco: number; obrigatorio: number };

export type StoreProdutoVariacoes = {
  variacoes: StoreVariacao[];
  extras: StoreExtraItem[];
  extras_obrigatorio: 0 | 1;
  complementos_itens: StoreExtraItem[];
  complementos_itens_obrigatorio: 0 | 1;
};

export type StoreComboPassoOpcao = {
  id: number;
  nome: string;
  imagem: string;
  estoque: number;
  esgotado: boolean;
};

export type StoreComboPasso = {
  id: number;
  nome: string;
  descricao: string | null;
  obrigatorio: 0 | 1;
  min_itens: number;
  max_itens: number;
  permite_repetir: 0 | 1;
  opcoes: StoreComboPassoOpcao[];
};

export type StoreComboDetalhe = {
  passos: StoreComboPasso[];
};

export type StoreCupomResultado = {
  codigo: string;
  tipo: "valor" | "percent" | "frete";
  desconto: number;
  valor: number;
  primeira_compra: 0 | 1;
  msg: string;
};

/** Item do carrinho no formato client-side. Vira `itens[]` no payload de pedido_criar.php. */
export type StoreCartItem = {
  key: string;
  id: number;
  tipo: "produto" | "combo";
  nome: string;
  precoUnit: number;
  qtd: number;
  obs: string;
  /** So preenchido em itens de combo: a observacao livre digitada pelo cliente, separada dos nomes das opcoes escolhidas (que ja vao em `combosels`) — `obs` continua com tudo concatenado, no formato que o resto do sistema (pedido_criar.php, WhatsLilly) espera. */
  obsUsuario?: string;
  imagem?: string;
  /** Limite de unidades (estoque do produto, ou do combo mais restritivo entre os componentes escolhidos). Sem limite conhecido se ausente. */
  estoqueMax?: number;
  combosels?: { id: number; nome: string; qtd: number; passoNome?: string }[];
};

export type StoreCrossSellProduto = {
  id: number;
  nome: string;
  preco: number;
  imagem: string;
  estoque: number;
};

export type StorePedidoCriarResposta = {
  id: number;
  codigo: number | string;
  token: string;
};
