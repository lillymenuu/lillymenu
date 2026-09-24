import "server-only";
import { listagemLojasSuperadmin } from "@/db/queries/superadminLojas";
import { conversasSuporte as conversasSuporteNeon } from "@/db/queries/suporteChat";
import type { SaLojasResposta } from "@/lib/superadmin";
import type { SaConversa } from "@/components/superadmin/sa-suporte";

export async function getListagemLojasSuperadmin(): Promise<SaLojasResposta> {
  const d = await listagemLojasSuperadmin();

  return {
    ok: true,
    lojas: d.lojas.map((l) => ({
      id: l.id,
      nome: l.nome,
      ativo: l.ativo,
      criado_em: l.criadoEm,
      status: l.status,
      em_teste: l.emTeste,
      trial_inicio: l.trialInicio,
      trial_fim: l.trialFim,
      expira_em: l.expiraEm,
      expira_dias: l.expiraDias,
      contato: l.contato,
      admin: l.admin,
      plano_id: l.planoId,
      plano_nome: l.planoNome,
      plano_valor: l.planoValor,
      plano_desejado: l.planoDesejado,
      cobranca: {
        id: l.cobranca.id,
        status: l.cobranca.status,
        valor: l.cobranca.valor,
        vencimento: l.cobranca.vencimento,
        comprovante: l.cobranca.comprovante,
        comprovante_em: l.cobranca.comprovanteEm,
        motivo_rejeicao: l.cobranca.motivoRejeicao,
        aguardando_revisao: l.cobranca.aguardandoRevisao,
        aprovado: l.cobranca.aprovado,
      },
    })),
    leads: d.leads.map((lead) => ({
      id: lead.id,
      criado_em: lead.criadoEm,
      nome: lead.nome ?? "",
      empresa: lead.empresa ?? "",
      email: lead.email ?? "",
      whatsapp: lead.whatsapp ?? "",
      cnpj: lead.cnpj ?? "",
      cep: lead.cep ?? "",
      cidade: lead.cidade ?? "",
      estado: lead.estado ?? "",
      segmento: lead.segmento ?? "",
    })),
    planos: d.planos,
    categorias: d.categorias,
    config: { pix_chave: d.config.pixChave, pix_nome: d.config.pixNome, whats_numero: d.config.whatsNumero, nominatim_ativo: d.config.nominatimAtivo },
  };
}

export async function getConversasSuporteSuperadmin(apenasComMensagens: boolean): Promise<SaConversa[]> {
  const linhas = await conversasSuporteNeon(apenasComMensagens);
  return linhas.map((c) => ({
    loja_id: c.lojaId,
    nome: c.nome ?? "",
    logo: c.logo,
    ultima_mensagem: c.ultimaMensagem,
    ultimo_anexo: c.ultimoAnexo,
    ultima_em: c.ultimaEm,
    nao_lidas: c.naoLidas,
  }));
}
