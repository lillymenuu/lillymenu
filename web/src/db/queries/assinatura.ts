import "server-only";
import { and, eq, desc, gt, inArray, ne, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { assinaturas, planos, cobrancas, configuracoes, admins, lojas, operacaoLogs } from "@/db/schema";
import { getConfig } from "@/db/queries/config";

/*
 * Equivalente de admin/api/v1/assinatura_detalhe.php, assinatura_historico.php,
 * assinatura_transacao_detalhe.php, assinatura_perfil_cobranca_salvar.php e
 * assinatura_trocar_plano.php: tela de Assinatura/plano (/plan-details),
 * visao do lojista. Pagamento via Pix (pagamento_pix_criar.php e afins) fica
 * para a proxima etapa.
 */

async function registrarOperacao(operadorId: number | null, acao: string, referencia: string, dados?: Record<string, unknown>): Promise<void> {
  try {
    await db.insert(operacaoLogs).values({ operador_id: operadorId, acao, referencia, dados: dados ? JSON.stringify(dados) : null });
  } catch {
    // silencia — log nao pode interromper o fluxo principal
  }
}

export type CobrancaPendente = {
  id: number;
  valor: number;
  vencimento: string;
  status: string;
  comprovanteArquivo: string | null;
  comprovanteEnviadoEm: string | null;
  motivoRejeicao: string | null;
};

export type DetalheAssinaturaResultado = {
  assinatura: { id: number; status: string; trialFim: string | null; cicloFim: string | null };
  plano: { id: number; nome: string; valor: number };
  assinaturaDesde: string | null;
  lojaNome: string;
  cobrancaPendente: CobrancaPendente | null;
  planosDisponiveis: { id: number; nome: string; valor: number }[];
  perfilCobranca: { cpf: string; telefone: string };
  saas: { pixChave: string; pixNome: string; whatsappNumero: string };
};

export async function detalheAssinatura(lojaId: number): Promise<DetalheAssinaturaResultado> {
  const lojaNome = await getConfig(lojaId, "nome_loja", "Minha loja");

  const [assinatura] = await db
    .select({ id: assinaturas.id, status: assinaturas.status, trialInicio: assinaturas.trial_inicio, trialFim: assinaturas.trial_fim, cicloInicio: assinaturas.ciclo_inicio, cicloFim: assinaturas.ciclo_fim, planoId: assinaturas.plano_id, criadoEm: assinaturas.criado_em })
    .from(assinaturas)
    .where(eq(assinaturas.loja_id, lojaId))
    .orderBy(desc(assinaturas.id))
    .limit(1);

  const [planoAtual] = await db
    .select({ id: planos.id, nome: planos.nome, valor: planos.valor })
    .from(planos)
    .where(eq(planos.id, assinatura?.planoId ?? 1))
    .limit(1);
  const plano = planoAtual ?? { id: 0, nome: "Mensal", valor: 50 };

  let status = (assinatura?.status ?? "trial").toLowerCase().trim();
  if (status === "ativo") status = "ativa";

  const assinaturaDesde = assinatura?.cicloInicio ?? assinatura?.trialInicio ?? assinatura?.criadoEm ?? null;

  let cobrancaPendente: CobrancaPendente | null = null;
  if (assinatura?.id) {
    const [c] = await db
      .select({ id: cobrancas.id, valor: cobrancas.valor, vencimento: cobrancas.vencimento, status: cobrancas.status, comprovanteArquivo: cobrancas.comprovante_arquivo, comprovanteEnviadoEm: cobrancas.comprovante_enviado_em, motivoRejeicao: cobrancas.motivo_rejeicao })
      .from(cobrancas)
      .where(and(eq(cobrancas.assinatura_id, assinatura.id), inArray(cobrancas.status, ["pendente", "atrasado"])))
      .orderBy(desc(cobrancas.id))
      .limit(1);
    cobrancaPendente = c ?? null;
  }

  const saasCfgRaw = await db.select({ chave: configuracoes.chave, valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.loja_id, 0), inArray(configuracoes.chave, ["saas_pix_chave", "saas_pix_nome", "saas_whatsapp_numero"])));
  const saasCfg: Record<string, string> = {};
  for (const l of saasCfgRaw) saasCfg[l.chave] = l.valor;

  // So upgrade (valor maior que o plano atual) aparece pra troca self-service —
  // reduzir de plano precisa passar pelo suporte, pra evitar downgrade acidental.
  const planosDisponiveis = await db
    .select({ id: planos.id, nome: planos.nome, valor: planos.valor })
    .from(planos)
    .where(and(eq(planos.ativo, true), sql`${planos.landing_slug} is not null`, ne(planos.id, assinatura?.planoId ?? 0), gt(planos.valor, plano.valor)))
    .orderBy(planos.valor);

  const perfilCfgRaw = await db.select({ chave: configuracoes.chave, valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.loja_id, lojaId), inArray(configuracoes.chave, ["cobranca_cpf", "cobranca_telefone"])));
  const perfilCfg: Record<string, string> = {};
  for (const l of perfilCfgRaw) perfilCfg[l.chave] = l.valor;

  return {
    assinatura: { id: assinatura?.id ?? 0, status, trialFim: assinatura?.trialFim ?? null, cicloFim: assinatura?.cicloFim ?? null },
    plano: { id: plano.id, nome: plano.nome, valor: Number(plano.valor) },
    assinaturaDesde,
    lojaNome,
    cobrancaPendente,
    planosDisponiveis,
    perfilCobranca: { cpf: perfilCfg.cobranca_cpf ?? "", telefone: perfilCfg.cobranca_telefone ?? "" },
    saas: { pixChave: saasCfg.saas_pix_chave ?? "", pixNome: saasCfg.saas_pix_nome ?? "", whatsappNumero: saasCfg.saas_whatsapp_numero ?? "5585985049577" },
  };
}

export type TransacaoResumo = { id: number; valor: number; status: string; origem: string; vencimento: string; pagoEm: string | null; criadoEm: string };

export async function historicoAssinatura(lojaId: number): Promise<TransacaoResumo[]> {
  const [assinatura] = await db.select({ id: assinaturas.id }).from(assinaturas).where(eq(assinaturas.loja_id, lojaId)).orderBy(desc(assinaturas.id)).limit(1);
  if (!assinatura) return [];

  const linhas = await db
    .select({ id: cobrancas.id, valor: cobrancas.valor, status: cobrancas.status, origem: cobrancas.origem, vencimento: cobrancas.vencimento, pagoEm: cobrancas.pago_em, criadoEm: cobrancas.criado_em })
    .from(cobrancas)
    .where(eq(cobrancas.assinatura_id, assinatura.id))
    .orderBy(desc(cobrancas.id));

  return linhas;
}

export type DetalheTransacaoResultado = {
  transacao: TransacaoResumo;
  pagador: { nome: string; email: string; cpf: string; telefone: string };
};

export async function detalheTransacao(lojaId: number, adminId: number, cobrancaId: number): Promise<{ ok: true } & DetalheTransacaoResultado | { ok: false; msg: string }> {
  if (cobrancaId <= 0) return { ok: false, msg: "Transacao invalida." };

  const [transacao] = await db
    .select({ id: cobrancas.id, valor: cobrancas.valor, status: cobrancas.status, origem: cobrancas.origem, vencimento: cobrancas.vencimento, pagoEm: cobrancas.pago_em, criadoEm: cobrancas.criado_em })
    .from(cobrancas)
    .innerJoin(assinaturas, eq(assinaturas.id, cobrancas.assinatura_id))
    .where(and(eq(cobrancas.id, cobrancaId), eq(assinaturas.loja_id, lojaId)))
    .limit(1);
  if (!transacao) return { ok: false, msg: "Transacao nao encontrada." };

  const [admin] = await db.select({ nome: admins.nome, email: admins.email }).from(admins).where(eq(admins.id, adminId)).limit(1);

  const cfgRaw = await db.select({ chave: configuracoes.chave, valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.loja_id, lojaId), inArray(configuracoes.chave, ["cobranca_cpf", "cobranca_telefone"])));
  const cfg: Record<string, string> = {};
  for (const l of cfgRaw) cfg[l.chave] = l.valor;

  return {
    ok: true,
    transacao,
    pagador: { nome: admin?.nome ?? "", email: admin?.email ?? "", cpf: cfg.cobranca_cpf ?? "", telefone: cfg.cobranca_telefone ?? "" },
  };
}

export async function salvarPerfilCobranca(lojaId: number, cpf: string, telefone: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  try {
    await db.insert(configuracoes).values({ loja_id: lojaId, chave: "cobranca_cpf", valor: cpf.trim() }).onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor: cpf.trim() } });
    await db.insert(configuracoes).values({ loja_id: lojaId, chave: "cobranca_telefone", valor: telefone.trim() }).onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor: telefone.trim() } });
    return { ok: true };
  } catch {
    return { ok: false, msg: "Erro ao salvar perfil de cobranca." };
  }
}

export async function trocarPlano(lojaId: number, operadorId: number, planoIdInput: number): Promise<{ ok: true; planoNome: string } | { ok: false; msg: string }> {
  if (planoIdInput <= 0) return { ok: false, msg: "Selecione um plano." };

  const [planoNovo] = await db.select({ id: planos.id, nome: planos.nome, valor: planos.valor }).from(planos).where(and(eq(planos.id, planoIdInput), eq(planos.ativo, true), sql`${planos.landing_slug} is not null`)).limit(1);
  if (!planoNovo) return { ok: false, msg: "Plano invalido." };

  const [assinatura] = await db.select({ id: assinaturas.id, planoId: assinaturas.plano_id }).from(assinaturas).where(eq(assinaturas.loja_id, lojaId)).orderBy(desc(assinaturas.id)).limit(1);
  if (!assinatura) return { ok: false, msg: "Assinatura nao encontrada." };

  if (assinatura.planoId === planoIdInput) return { ok: false, msg: "Voce ja esta neste plano." };

  const [planoAtual] = await db.select({ valor: planos.valor }).from(planos).where(eq(planos.id, assinatura.planoId)).limit(1);
  const valorAtual = Number(planoAtual?.valor ?? 0);
  if (Number(planoNovo.valor) <= valorAtual) return { ok: false, msg: "Para reduzir de plano, entre em contato com o suporte." };

  const [pendente] = await db.select({ id: cobrancas.id }).from(cobrancas).where(and(eq(cobrancas.assinatura_id, assinatura.id), inArray(cobrancas.status, ["pendente", "atrasado"]))).limit(1);
  if (pendente) return { ok: false, msg: "Finalize o pagamento pendente antes de trocar de plano." };

  await withTransaction(async (tx) => {
    await tx.update(assinaturas).set({ plano_id: planoIdInput }).where(eq(assinaturas.id, assinatura.id));
    await tx.update(lojas).set({ plano_id: planoIdInput }).where(eq(lojas.id, lojaId));
  });

  await registrarOperacao(operadorId, "assinatura_trocou_plano", `loja:${lojaId}`, { plano_anterior_id: assinatura.planoId, plano_novo_id: planoIdInput });

  return { ok: true, planoNome: planoNovo.nome };
}
