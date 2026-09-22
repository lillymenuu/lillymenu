import "server-only";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { leadsLojas } from "@/db/schema";

/*
 * Equivalente de admin/superadmin/helpers.php (buscarLojasComDetalhes,
 * resolverStatusLoja, buscarLeadsRecentes): dados de todas as lojas do
 * SaaS (assinatura/plano/cobranca mais recentes, primeiro admin), usados
 * tanto pelo dashboard quanto pela tela de gestao de lojas do superadmin.
 */

export type LojaComDetalhes = {
  id: number;
  nome: string | null;
  ativo: boolean | null;
  lojaPlanoId: number | null;
  criadoEm: string | null;
  status: string | null;
  trialInicio: string | null;
  trialFim: string | null;
  cicloFim: string | null;
  planoId: number | null;
  planoNome: string | null;
  planoValor: number | null;
  planoDesejadoNome: string | null;
  adminId: number | null;
  adminNome: string | null;
  adminEmail: string | null;
  adminUsuario: string | null;
  lojaContato: string | null;
  cobrancaId: number | null;
  cobrancaValor: number | null;
  cobrancaVencimento: string | null;
  cobrancaStatus: string | null;
  comprovanteArquivo: string | null;
  comprovanteEnviadoEm: string | null;
  motivoRejeicao: string | null;
};

/** Uma linha por loja, com a assinatura mais recente, o plano dela, a cobranca mais recente dessa assinatura e o admin mais antigo da loja. */
export async function buscarLojasComDetalhes(): Promise<LojaComDetalhes[]> {
  const resultado = await db.execute<{
    id: number;
    nome: string | null;
    ativo: boolean | null;
    loja_plano_id: number | null;
    criado_em: string | null;
    status: string | null;
    trial_inicio: string | null;
    trial_fim: string | null;
    ciclo_fim: string | null;
    plano_id: number | null;
    plano_nome: string | null;
    plano_valor: string | null;
    plano_desejado_nome: string | null;
    admin_id: number | null;
    admin_nome: string | null;
    admin_email: string | null;
    admin_usuario: string | null;
    loja_contato: string | null;
    cobranca_id: number | null;
    cobranca_valor: string | null;
    cobranca_vencimento: string | null;
    cobranca_status: string | null;
    comprovante_arquivo: string | null;
    comprovante_enviado_em: string | null;
    motivo_rejeicao: string | null;
  }>(sql`
    SELECT l.id, l.nome, l.ativo, l.plano_id AS loja_plano_id, l.criado_em::text,
           a.status, a.trial_inicio::text, a.trial_fim::text, a.ciclo_fim::text, a.plano_id,
           p.nome AS plano_nome, p.valor AS plano_valor,
           lp.nome AS plano_desejado_nome,
           ad.id AS admin_id, ad.nome AS admin_nome, ad.email AS admin_email, ad.usuario AS admin_usuario,
           (SELECT valor FROM configuracoes c WHERE c.loja_id = l.id AND c.chave = 'loja_contato' LIMIT 1) AS loja_contato,
           cb.id AS cobranca_id, cb.valor AS cobranca_valor, cb.vencimento::text AS cobranca_vencimento,
           cb.status AS cobranca_status, cb.comprovante_arquivo, cb.comprovante_enviado_em::text, cb.motivo_rejeicao
    FROM lojas l
    LEFT JOIN LATERAL (
      SELECT a1.* FROM assinaturas a1 WHERE a1.loja_id = l.id ORDER BY a1.id DESC LIMIT 1
    ) a ON true
    LEFT JOIN planos p ON p.id = a.plano_id
    LEFT JOIN planos lp ON lp.id = l.plano_id
    LEFT JOIN LATERAL (
      SELECT ad1.id, ad1.nome, ad1.email, ad1.usuario FROM admins ad1 WHERE ad1.loja_id = l.id ORDER BY ad1.id ASC LIMIT 1
    ) ad ON true
    LEFT JOIN LATERAL (
      SELECT c1.* FROM cobrancas c1 WHERE c1.assinatura_id = a.id ORDER BY c1.id DESC LIMIT 1
    ) cb ON true
    ORDER BY l.id DESC
  `);

  return resultado.rows.map((l) => ({
    id: l.id,
    nome: l.nome,
    ativo: l.ativo,
    lojaPlanoId: l.loja_plano_id,
    criadoEm: l.criado_em,
    status: l.status,
    trialInicio: l.trial_inicio,
    trialFim: l.trial_fim,
    cicloFim: l.ciclo_fim,
    planoId: l.plano_id,
    planoNome: l.plano_nome,
    planoValor: l.plano_valor !== null ? Number(l.plano_valor) : null,
    planoDesejadoNome: l.plano_desejado_nome,
    adminId: l.admin_id,
    adminNome: l.admin_nome,
    adminEmail: l.admin_email,
    adminUsuario: l.admin_usuario,
    lojaContato: l.loja_contato,
    cobrancaId: l.cobranca_id,
    cobrancaValor: l.cobranca_valor !== null ? Number(l.cobranca_valor) : null,
    cobrancaVencimento: l.cobranca_vencimento,
    cobrancaStatus: l.cobranca_status,
    comprovanteArquivo: l.comprovante_arquivo,
    comprovanteEnviadoEm: l.comprovante_enviado_em,
    motivoRejeicao: l.motivo_rejeicao,
  }));
}

export type LojaComStatus = LojaComDetalhes & {
  statusResolvido: string;
  isTrialPeriodo: boolean;
  expiraEm: string | null;
  expiraDias: number | null;
};

function diasEntre(hoje: Date, dataAlvo: Date): number {
  const msPorDia = 86_400_000;
  const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const alvoUTC = Date.UTC(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate());
  return Math.round((alvoUTC - hojeUTC) / msPorDia);
}

/** Enriquece uma linha de loja com status_resolvido/is_trial_periodo/expira_em/expira_dias — sem acumular estatisticas (isso fica por conta de quem chama). */
export function resolverStatusLoja(l: LojaComDetalhes, hoje: Date): LojaComStatus {
  let status = (l.status ?? "").trim().toLowerCase();
  if (status === "ativo") status = "ativa";
  if (status === "") status = l.ativo ? "ativa" : "suspensa";

  if (status === "trial" && l.trialFim) {
    const trialFimDate = new Date(`${l.trialFim}T00:00:00`);
    if (!Number.isNaN(trialFimDate.getTime()) && trialFimDate < hoje) status = "suspensa";
  }
  if (status === "ativa" && l.cicloFim) {
    const cicloFimDate = new Date(`${l.cicloFim}T00:00:00`);
    if (!Number.isNaN(cicloFimDate.getTime()) && cicloFimDate < hoje) status = "suspensa";
  }

  let isTrialPeriodo = false;
  if (l.trialFim) {
    const trialFim = new Date(`${l.trialFim}T00:00:00`);
    if (!Number.isNaN(trialFim.getTime()) && trialFim >= hoje && status === "trial") isTrialPeriodo = true;
  }

  let usaTrial = status === "trial" || isTrialPeriodo;
  if (!usaTrial && !l.cicloFim && l.trialFim) usaTrial = true;
  const expiraEm = usaTrial ? (l.trialFim ?? null) : (l.cicloFim ?? null);

  let expiraDias: number | null = null;
  if (expiraEm) {
    const dataExpira = new Date(`${expiraEm}T00:00:00`);
    if (!Number.isNaN(dataExpira.getTime())) expiraDias = diasEntre(hoje, dataExpira);
  }

  return { ...l, statusResolvido: status, isTrialPeriodo, expiraEm, expiraDias };
}

export type LeadLoja = {
  id: number;
  nome: string;
  empresa: string;
  email: string;
  whatsapp: string;
  cnpj: string;
  cep: string;
  cidade: string;
  estado: string;
  segmento: string | null;
  criadoEm: string | null;
};

export async function buscarLeadsRecentes(limite = 50): Promise<LeadLoja[]> {
  const linhas = await db
    .select({ id: leadsLojas.id, nome: leadsLojas.nome, empresa: leadsLojas.empresa, email: leadsLojas.email, whatsapp: leadsLojas.whatsapp, cnpj: leadsLojas.cnpj, cep: leadsLojas.cep, cidade: leadsLojas.cidade, estado: leadsLojas.estado, segmento: leadsLojas.segmento, criadoEm: leadsLojas.criado_em })
    .from(leadsLojas)
    .orderBy(desc(leadsLojas.id))
    .limit(limite);
  return linhas;
}
