import { phpApiFetch } from "@/lib/phpApi";

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

export function getAssinaturaDetalhe() {
  return phpApiFetch<AssinaturaDetalheResposta>("/admin/api/v1/assinatura_detalhe.php");
}
