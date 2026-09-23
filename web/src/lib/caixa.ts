import "server-only";
import { resumoCaixaAtual } from "@/db/queries/caixaResumo";

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

export async function getCaixaResumo(lojaId: number): Promise<CaixaResumoResposta> {
  const resultado = await resumoCaixaAtual(lojaId);
  if (!resultado.caixa) return { ok: true, caixa: null };

  const { caixa, resumo, movimentos } = resultado;
  return {
    ok: true,
    caixa: { id: caixa.id, status: caixa.status, saldo_inicial: caixa.saldoInicial, aberto_em: caixa.abertoEm, operador: caixa.operador },
    resumo: {
      saldo_inicial_dia: resumo.saldoInicialDia,
      pagamentos: resumo.pagamentos,
      saldo_esperado: resumo.saldoEsperado,
      entrada_total: resumo.entradaTotal,
      saida_total: resumo.saidaTotal,
      saldo_total: resumo.saldoTotal,
      troco: resumo.troco,
      taxa_maquininha: resumo.taxaMaquininha,
      sangrias_total: resumo.sangriasTotal,
      total_vendas: resumo.totalVendas,
      taxa_entrega: resumo.taxaEntrega,
      total_sem_taxa_entrega: resumo.totalSemTaxaEntrega,
    },
    movimentos: movimentos.map((m) => ({ uid: m.uid, forma: m.forma, valor: m.valor, criado_em: m.criadoEm, observacoes: m.observacoes, direcao: m.direcao, origem: m.origem })),
  };
}
