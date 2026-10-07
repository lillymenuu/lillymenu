import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { configuracoes } from "@/db/schema";
import { listagemLojasSuperadmin } from "@/db/queries/superadminLojas";
import { conversasSuporte as conversasSuporteNeon } from "@/db/queries/suporteChat";
import { buscarLojasComDetalhes } from "@/db/queries/superadminHelpers";
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

export type SaNotificacao = {
  tipo: "cadastro" | "suporte";
  loja_id: number;
  loja_nome: string;
  logo: string | null;
  titulo: string;
  subtitulo: string;
  quando: string;
  lida: boolean;
};

/** Feed combinado pro sininho do topbar: lojas que se cadastraram recentemente (sempre "lida" no
 * servidor — o "visto" é controlado no cliente via localStorage, não existe estado de leitura real
 * pra um cadastro) + lojas que mandaram mensagem de suporte (lida = sem mensagem não lida de verdade,
 * mesmo contador já usado no sino/badge de "Suporte" da sidebar). Mistura e ordena por data. */
export async function getNotificacoesSuperadmin(): Promise<SaNotificacao[]> {
  const [lojasDetalhes, conversas] = await Promise.all([buscarLojasComDetalhes(), conversasSuporteNeon(true)]);

  const cadastrosRecentes = lojasDetalhes
    .filter((l): l is typeof l & { criadoEm: string } => l.criadoEm !== null)
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))
    .slice(0, 8);

  const idsCadastro = cadastrosRecentes.map((l) => l.id);
  const logos = idsCadastro.length
    ? await db
        .select({ lojaId: configuracoes.loja_id, valor: configuracoes.valor })
        .from(configuracoes)
        .where(and(inArray(configuracoes.loja_id, idsCadastro), eq(configuracoes.chave, "loja_perfil")))
    : [];
  const logoPorLoja = new Map(logos.map((l) => [l.lojaId, l.valor]));

  const notifCadastro: SaNotificacao[] = cadastrosRecentes.map((l) => ({
    tipo: "cadastro",
    loja_id: l.id,
    loja_nome: l.nome ?? "Loja sem nome",
    logo: logoPorLoja.get(l.id) ?? null,
    titulo: "Nova loja cadastrada",
    subtitulo: `${l.nome ?? "Uma loja"} se cadastrou na plataforma`,
    quando: l.criadoEm,
    lida: true,
  }));

  const notifSuporte: SaNotificacao[] = conversas
    .filter((c): c is typeof c & { ultimaEm: string } => c.ultimaEm !== null)
    .slice(0, 8)
    .map((c) => ({
      tipo: "suporte",
      loja_id: c.lojaId,
      loja_nome: c.nome ?? "Loja sem nome",
      logo: c.logo,
      titulo: "Nova mensagem de suporte",
      subtitulo: c.ultimaMensagem ?? (c.ultimoAnexo ? "Enviou uma imagem" : ""),
      quando: c.ultimaEm,
      lida: c.naoLidas === 0,
    }));

  return [...notifCadastro, ...notifSuporte].sort((a, b) => (a.quando < b.quando ? 1 : -1)).slice(0, 12);
}
