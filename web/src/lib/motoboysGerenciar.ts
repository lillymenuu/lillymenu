import "server-only";
import { gerenciarMotoboys } from "@/db/queries/motoboys";

export type MotoboyGerenciar = {
  id: number;
  nome: string;
  whatsapp: string;
  data_cadastro: string;
  ativo: number;
  entregas_periodo: number;
  taxas_periodo: number;
};

export type MotoboysGerenciarResposta = {
  ok: true;
  periodo: string;
  data_inicio: string;
  data_fim: string;
  stats: {
    total_motoboys: number;
    entregas_periodo: number;
    taxas_periodo: number;
  };
  motoboys: MotoboyGerenciar[];
};

export type MotoboyEntrega = {
  id: number;
  codigo: number;
  status: string;
  criado_em: string;
  endereco_entrega: string;
  taxa_entrega: number;
  cliente_nome: string;
  cliente_telefone: string;
  motoboy_nome: string;
  motoboy_whatsapp: string;
};

export type MotoboysEntregasResposta = {
  ok: true;
  entregas: MotoboyEntrega[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  mostrando_de: number;
  mostrando_ate: number;
};

export type MotoboysPeriodoParams = {
  periodo?: string;
  data_inicio?: string;
  data_fim?: string;
};

export async function getMotoboysGerenciar(lojaId: number, params: MotoboysPeriodoParams = {}): Promise<MotoboysGerenciarResposta> {
  const resultado = await gerenciarMotoboys(lojaId, params.periodo ?? "hoje", params.data_inicio ?? "", params.data_fim ?? "");
  return {
    ok: true,
    periodo: resultado.periodo,
    data_inicio: resultado.dataInicio,
    data_fim: resultado.dataFim,
    stats: { total_motoboys: resultado.stats.totalMotoboys, entregas_periodo: resultado.stats.entregasPeriodo, taxas_periodo: resultado.stats.taxasPeriodo },
    motoboys: resultado.motoboys.map((m) => ({ id: m.id, nome: m.nome, whatsapp: m.whatsapp, data_cadastro: m.dataCadastro, ativo: m.ativo ? 1 : 0, entregas_periodo: m.entregasPeriodo, taxas_periodo: m.taxasPeriodo })),
  };
}
