import "server-only";
import { relatorioFidelidade } from "@/db/queries/relatoriosFidelidade";

export type ClienteFidelidade = {
  nome: string;
  criado_em: string | null;
  saldo: number;
  usado: number;
  expira_em: string | null;
};

export type MovimentoFidelidade = {
  tipo: string;
  classe: "positivo" | "negativo";
  data: string | null;
  valor: number;
};

export type RelatoriosFidelidadeResposta = {
  ok: true;
  data_ini: string;
  data_fim: string;
  cashback_saldo_base: number;
  cashback_utilizado: number;
  pedidos_com_cashback: number;
  clientes: ClienteFidelidade[];
  historico: MovimentoFidelidade[];
  cupom_desconto: number;
  cupom_pedidos: number;
};

export type RelatoriosFidelidadeParams = {
  periodo?: string;
  data_ini?: string;
  data_fim?: string;
};

export async function getRelatoriosFidelidade(lojaId: number, params: RelatoriosFidelidadeParams = {}): Promise<RelatoriosFidelidadeResposta> {
  const resultado = await relatorioFidelidade({ lojaId, periodo: params.periodo, dataIni: params.data_ini, dataFim: params.data_fim });
  return {
    ok: true,
    data_ini: resultado.dataIni,
    data_fim: resultado.dataFim,
    cashback_saldo_base: resultado.cashbackSaldoBase,
    cashback_utilizado: resultado.cashbackUtilizado,
    pedidos_com_cashback: resultado.pedidosComCashback,
    clientes: resultado.clientes.map((c) => ({ nome: c.nome, criado_em: c.criadoEm, saldo: c.saldo, usado: c.usado, expira_em: c.expiraEm })),
    historico: resultado.historico.map((h) => ({ tipo: h.tipo, classe: h.classe, data: h.data, valor: h.valor })),
    cupom_desconto: resultado.cupomDesconto,
    cupom_pedidos: resultado.cupomPedidos,
  };
}
