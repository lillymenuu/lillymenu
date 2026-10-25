import "server-only";
import { relatorioGarcons, type Turno } from "@/db/queries/relatorioGarcom";

export type WaiterReportLinha = {
  garcom_id: number;
  nome: string;
  ativo: boolean;
  mesas_atendidas: number;
  pedidos: number;
  valor_vendido: number;
  ticket_medio: number;
  base_comissao: number;
  comissao_valor: number;
  giro_medio_minutos: number | null;
};

export type WaiterReportTopProduto = { nome: string; qtd: number; valor: number };
export type WaiterReportMesaOciosa = { id: number; numero: number; nome: string };
export type WaiterReportChamado = { mesa_id: number; mesa_nome: string; garcom_nome: string | null; minutos: number };

export type WaiterReportResposta = {
  ok: true;
  periodo: { inicio: string; fim: string };
  turno: Turno;
  taxa_servico_pct: number;
  por_garcom: WaiterReportLinha[];
  top_produtos: WaiterReportTopProduto[];
  mesas_sem_movimento: WaiterReportMesaOciosa[];
  chamados_abertos: WaiterReportChamado[];
};

export type WaiterReportParams = { periodo?: string; data_ini?: string; data_fim?: string; turno?: Turno; garcom_id?: number };

export async function getWaiterReport(lojaId: number, params: WaiterReportParams = {}): Promise<WaiterReportResposta> {
  const resultado = await relatorioGarcons({
    lojaId,
    periodo: params.periodo,
    dataIni: params.data_ini,
    dataFim: params.data_fim,
    turno: params.turno,
    garcomId: params.garcom_id,
  });

  return {
    ok: true,
    periodo: resultado.periodo,
    turno: resultado.turno,
    taxa_servico_pct: resultado.taxaServicoPct,
    por_garcom: resultado.porGarcom.map((l) => ({
      garcom_id: l.garcomId,
      nome: l.nome,
      ativo: l.ativo,
      mesas_atendidas: l.mesasAtendidas,
      pedidos: l.pedidos,
      valor_vendido: l.valorVendido,
      ticket_medio: l.ticketMedio,
      base_comissao: l.baseComissao,
      comissao_valor: l.comissaoValor,
      giro_medio_minutos: l.giroMedioMinutos,
    })),
    top_produtos: resultado.topProdutos,
    mesas_sem_movimento: resultado.mesasSemMovimento,
    chamados_abertos: resultado.chamadosAbertos.map((c) => ({ mesa_id: c.mesaId, mesa_nome: c.mesaNome, garcom_nome: c.garcomNome, minutos: c.minutos })),
  };
}
