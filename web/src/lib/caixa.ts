import { phpApiFetch } from "@/lib/phpApi";

export type CaixaAtual = {
  id: number;
  status: "aberto" | "fechado";
  saldo_inicial: number;
  aberto_em: string;
  operador: string | null;
};

export type CaixaMovimento = {
  uid: string;
  forma: string;
  valor: number;
  criado_em: string;
  observacoes: string | null;
  direcao: "entrada" | "saida";
  origem: string;
};

export type CaixaResumoResposta = {
  ok: true;
  caixa: CaixaAtual | null;
  resumo?: {
    saldo_inicial_dia: number;
    pagamentos: {
      pix: number;
      credito: number;
      debito: number;
      dinheiro: number;
      voucher: number;
      outro: number;
    };
    saldo_esperado: number;
    entrada_total: number;
    saida_total: number;
    saldo_total: number;
    troco: number;
    taxa_maquininha: number;
    sangrias_total: number;
    total_vendas: number;
    taxa_entrega: number;
    total_sem_taxa_entrega: number;
  };
  movimentos?: CaixaMovimento[];
};

export type CaixaHistoricoItem = {
  id: number;
  status: "aberto" | "fechado";
  aberto_em: string;
  fechado_em: string | null;
  operador: string | null;
};

export type CaixaHistoricoResposta = {
  ok: true;
  tipo: "fechado" | "completo";
  itens: CaixaHistoricoItem[];
  pagina: number;
  total_paginas: number;
  total: number;
  mostrando_de: number;
  mostrando_ate: number;
};

export type CaixaDetalheLinha = {
  uid: string;
  forma: string;
  valor: number;
  criado_em: string;
  observacoes: string | null;
  direcao: "entrada" | "saida";
  origem: string;
};

export type CaixaDetalheResposta = {
  ok: true;
  caixa: {
    id: number;
    status: "aberto" | "fechado";
    aberto_em: string;
    fechado_em: string | null;
    saldo_inicial: number;
    saldo_final: number | null;
    operador: string;
  };
  resumo: {
    entrada: number;
    saida: number;
    saldo: number;
    pedidos_total: number;
    manual_entrada: number;
    manual_saida: number;
  };
  formas: Record<string, number>;
  linhas: CaixaDetalheLinha[];
};

export function getCaixaResumo() {
  return phpApiFetch<CaixaResumoResposta>("/admin/api/v1/caixa_resumo.php");
}
