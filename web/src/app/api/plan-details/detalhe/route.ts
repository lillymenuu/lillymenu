import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheAssinatura } from "@/db/queries/assinatura";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const d = await detalheAssinatura(sessao.lojaId);

  return NextResponse.json({
    ok: true,
    assinatura: { id: d.assinatura.id, status: d.assinatura.status, trial_fim: d.assinatura.trialFim, ciclo_fim: d.assinatura.cicloFim },
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
  });
}
