export type OrcamentoStatus = "pendente" | "aprovado" | "recusado";

export type OrcamentoDescontoTipo = "valor" | "percent";

export type OrcamentoResumo = {
  id: number;
  status: OrcamentoStatus;
  cliente_nome: string;
  total: number;
  itens_count: number;
  criado_em: string;
  atualizado_em: string | null;
};

export type OrcamentoItem = {
  id: number;
  produto_id: number | null;
  nome: string;
  preco: number;
  qtd: number;
  observacoes: string | null;
};

export type Orcamento = {
  id: number;
  status: OrcamentoStatus;
  cliente_nome: string;
  cliente_tipo_documento: "fisica" | "juridica";
  cliente_documento: string | null;
  cliente_whatsapp: string | null;
  cliente_endereco: string | null;
  desconto_tipo: OrcamentoDescontoTipo;
  desconto_valor: number;
  subtotal: number;
  total: number;
  criado_em: string;
  atualizado_em: string | null;
};

export type OrcamentoProduto = {
  id: number;
  nome: string;
  preco: number;
  estoque: number;
  imagem: string | null;
};

export type OrcamentosListarResposta = {
  ok: true;
  orcamentos: OrcamentoResumo[];
};

export type OrcamentoDetalheResposta = {
  ok: true;
  orcamento: Orcamento;
  itens: OrcamentoItem[];
};

export type OrcamentoProdutosResposta = {
  ok: true;
  produtos: OrcamentoProduto[];
};

export const ORCAMENTO_STATUS_LABEL: Record<OrcamentoStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
};
