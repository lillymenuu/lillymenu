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
  geoAtivo: boolean;
  agendamentoDeliveryAtivo: boolean;
  agendamentoRetiradaAtivo: boolean;
  agendDeliveryMinTipo: "horas" | "dias";
  agendDeliveryMinVal: number;
  agendDeliveryMaxVal: number;
  agendDeliveryMaxTipo: "horas" | "dias";
  agendRetiradaMinTipo: "horas" | "dias";
  agendRetiradaMinVal: number;
  agendRetiradaMaxVal: number;
  agendRetiradaMaxTipo: "horas" | "dias";
  agendDeliveryHorarios: Record<string, StoreAgendHorario>;
  agendRetiradaHorarios: Record<string, StoreAgendHorario>;
};

export type StoreAgendHorario = { inicio: string; fim: string };

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
  pontos_ganho?: number;
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
  /** true quando adicionado a partir da sugestao "Peça também" no carrinho — vira pedido_itens.cross_sell no pedido_criar.php, base do relatorio de cross-sell. */
  crossSell?: boolean;
  /** So preenchido em resgates do Clube de Pontos — quantos pontos custou (obs fica "[Resgate de pontos]", precoUnit 0). */
  pontosCusto?: number;
  /** Pontos que o Clube da por unidade deste produto (o total do item e pontosGanho * qtd). */
  pontosGanho?: number;
};

export type StoreCrossSellProduto = {
  id: number;
  nome: string;
  preco: number;
  imagem: string;
  estoque: number;
  pontos_ganho?: number;
};

export type StorePedidoCriarResposta = {
  id: number;
  codigo: number | string;
  token: string;
};

export type StorePedidosClienteResposta = {
  ok: boolean;
  msg?: string;
  cliente?: {
    id: number;
    nome: string;
    telefone: string;
    saldo: number;
    cashback_saldo: number;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    complemento: string;
  };
  pedidos?: {
    id: number;
    status: string;
    total: string | number;
    taxa_entrega: string | number;
    forma_pagamento: string;
    criado_em: string;
    tipo: string;
    endereco_entrega: string;
    subtotal: string | number | null;
    codigo: number | string;
    itens: { produto_nome: string; quantidade: number; preco: string | number; observacoes: string }[];
  }[];
};

export type StorePedidoStatusResposta = {
  ok: boolean;
  msg?: string;
  pedido?: {
    id: number;
    codigo: number | string;
    status: string;
    tipo: string;
    total: number;
    taxa_entrega: number;
    forma_pagamento: string;
    troco: number | null;
    subtotal: number | null;
    desconto: number;
    cashback_usado: number | null;
    endereco_entrega: string;
    avaliado: boolean;
    criado_em: string;
    nome: string;
    telefone: string;
    agendamento: string | null;
    agendamento_em: string | null;
    tipo_agendamento: string | null;
  };
  itens?: { produto_nome: string; quantidade: number; preco: number | string; observacoes: string }[];
};

export type StorePontosProduto = {
  id: number;
  nome: string;
  descricao: string | null;
  pontos_custo: number;
  imagem: string;
  pontos_ganho: number;
  categoria: string | null;
};

export type StorePontosProdutosResposta = {
  ok: boolean;
  produtos: StorePontosProduto[];
};

export type StorePontosResgatarResposta = {
  ok: boolean;
  msg?: string;
  produto?: { id: number; nome: string; preco: number };
  custo?: number;
  saldo_antes?: number;
  saldo_novo?: number;
};

/** Foto do pedido no momento em que foi criado — base da mensagem completa de WhatsApp (o carrinho e limpo logo depois). */
export type StorePedidoSnapshot = {
  nome: string;
  telefone: string;
  itens: StoreCartItem[];
  tipo: "entrega" | "entrega_agendada" | "retirada" | "retirada_agendada";
  formaPagamento: string;
  trocoValor: number;
  endereco: string;
  agendamentoTexto: string;
  taxa: number;
  desconto: number;
  cashbackUsado: number;
  total: number;
};
