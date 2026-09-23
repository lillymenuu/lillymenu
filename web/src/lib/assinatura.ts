import "server-only";
import { detalheAssinatura } from "@/db/queries/assinatura";

export type AssinaturaStatus = "trial" | "ativa" | "suspensa" | "cancelada";

export type CobrancaPendente = {
  id: number;
  valor: number;
  vencimento: string | null;
  status: string;
  comprovante_arquivo: string | null;
  comprovante_enviado_em: string | null;
  motivo_rejeicao: string | null;
};

export type PlanoResumo = {
  id: number;
  nome: string;
  valor: number;
};

export type Transacao = {
  id: number;
  valor: number;
  status: string;
  origem: "manual" | "mercadopago";
  vencimento: string | null;
  pago_em: string | null;
  criado_em: string;
};

export type AssinaturaDetalheResposta = {
  ok: true;
  assinatura: {
    id: number;
    status: AssinaturaStatus;
    trial_fim: string | null;
    ciclo_fim: string | null;
  };
  plano: PlanoResumo;
  assinatura_desde: string | null;
  loja_nome: string;
  cobranca_pendente: CobrancaPendente | null;
  planos_disponiveis: PlanoResumo[];
  perfil_cobranca: { cpf: string; telefone: string };
  saas: { pix_chave: string; pix_nome: string; whatsapp_numero: string };
};

export async function getAssinaturaDetalhe(lojaId: number): Promise<AssinaturaDetalheResposta> {
  const d = await detalheAssinatura(lojaId);
  return {
    ok: true,
    assinatura: { id: d.assinatura.id, status: d.assinatura.status as AssinaturaStatus, trial_fim: d.assinatura.trialFim, ciclo_fim: d.assinatura.cicloFim },
    plano: d.plano,
    assinatura_desde: d.assinaturaDesde,
    loja_nome: d.lojaNome,
    cobranca_pendente: d.cobrancaPendente
      ? {
          id: d.cobrancaPendente.id,
          valor: d.cobrancaPendente.valor,
          vencimento: d.cobrancaPendente.vencimento,
          status: d.cobrancaPendente.status,
          comprovante_arquivo: d.cobrancaPendente.comprovanteArquivo,
          comprovante_enviado_em: d.cobrancaPendente.comprovanteEnviadoEm,
          motivo_rejeicao: d.cobrancaPendente.motivoRejeicao,
        }
      : null,
    planos_disponiveis: d.planosDisponiveis,
    perfil_cobranca: d.perfilCobranca,
    saas: { pix_chave: d.saas.pixChave, pix_nome: d.saas.pixNome, whatsapp_numero: d.saas.whatsappNumero },
  };
}
