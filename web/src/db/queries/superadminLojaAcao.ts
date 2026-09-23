import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { assinaturas, planos, lojas, admins, cobrancas } from "@/db/schema";
import { dataFortaleza, timestampFortaleza } from "@/db/queries/tempo";
import { confirmarPagamentoAssinatura } from "@/db/queries/pagamentoPix";
import { superadminExcluirLoja } from "@/db/queries/superadminLojaExcluir";

/*
 * Equivalente de admin/api/v1/superadmin_loja_acao.php: acoes do superadmin
 * sobre uma loja — ativar, suspender, excluir, trocar plano e
 * aprovar/rejeitar comprovante de pagamento.
 */

function somarDiasIso(dataISO: string, dias: number): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + dias * 86_400_000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export async function excluirLojaSuperadmin(lojaId: number) {
  return superadminExcluirLoja(lojaId);
}

export async function aprovarComprovante(cobrancaId: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (cobrancaId <= 0) return { ok: false, msg: "Cobrança inválida." };
  const ok = await confirmarPagamentoAssinatura(cobrancaId);
  return ok ? { ok: true } : { ok: false, msg: "Erro ao aprovar pagamento." };
}

export async function rejeitarComprovante(cobrancaId: number, motivoInput: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (cobrancaId <= 0) return { ok: false, msg: "Cobrança inválida." };
  const motivo = motivoInput.trim();
  try {
    await db
      .update(cobrancas)
      .set({ comprovante_arquivo: null, comprovante_enviado_em: null, motivo_rejeicao: motivo !== "" ? motivo : "Comprovante rejeitado.", status: "pendente" })
      .where(eq(cobrancas.id, cobrancaId));
    return { ok: true };
  } catch {
    return { ok: false, msg: "Erro ao rejeitar comprovante." };
  }
}

export async function trocarPlanoSuperadmin(lojaId: number, planoIdInput: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (lojaId <= 0 || planoIdInput <= 0) return { ok: false, msg: "Dados inválidos." };
  try {
    const [plano] = await db.select({ id: planos.id }).from(planos).where(and(eq(planos.id, planoIdInput), eq(planos.ativo, true))).limit(1);
    if (!plano) return { ok: false, msg: "Plano não encontrado." };

    const [assinatura] = await db.select({ id: assinaturas.id }).from(assinaturas).where(eq(assinaturas.loja_id, lojaId)).orderBy(desc(assinaturas.id)).limit(1);
    if (assinatura) {
      await db.update(assinaturas).set({ plano_id: planoIdInput }).where(eq(assinaturas.id, assinatura.id));
    } else {
      const hoje = dataFortaleza();
      await db.insert(assinaturas).values({ loja_id: lojaId, plano_id: planoIdInput, status: "trial", trial_inicio: hoje, trial_fim: somarDiasIso(hoje, 30) });
    }
    return { ok: true };
  } catch {
    return { ok: false, msg: "Erro ao atualizar plano." };
  }
}

async function resolverPlanoParaAtivacao(lojaId: number, planoIdAtual: number): Promise<number> {
  if (planoIdAtual > 0) return planoIdAtual;

  const [loja] = await db.select({ planoId: lojas.plano_id }).from(lojas).where(eq(lojas.id, lojaId)).limit(1);
  if (loja?.planoId) {
    const [planoValido] = await db.select({ id: planos.id }).from(planos).where(and(eq(planos.id, loja.planoId), eq(planos.ativo, true))).limit(1);
    if (planoValido) return planoValido.id;
  }

  const [primeiroAtivo] = await db.select({ id: planos.id }).from(planos).where(eq(planos.ativo, true)).orderBy(planos.id).limit(1);
  return primeiroAtivo?.id ?? 1;
}

export async function ativarLoja(lojaId: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (lojaId <= 0) return { ok: false, msg: "Ação inválida." };

  try {
    await withTransaction(async (tx) => {
      const [assinaturaRow] = await tx
        .select({ id: assinaturas.id, planoId: assinaturas.plano_id, status: assinaturas.status, trialFim: assinaturas.trial_fim })
        .from(assinaturas)
        .where(eq(assinaturas.loja_id, lojaId))
        .orderBy(desc(assinaturas.id))
        .limit(1);

      const hoje = dataFortaleza();
      let assinaturaId = assinaturaRow?.id ?? 0;
      let statusAtual = (assinaturaRow?.status ?? "").toLowerCase().trim();
      let trialFim = assinaturaRow?.trialFim ?? null;
      const planoId = await resolverPlanoParaAtivacao(lojaId, assinaturaRow?.planoId ?? 0);

      if (!assinaturaId) {
        const [nova] = await tx.insert(assinaturas).values({ loja_id: lojaId, plano_id: planoId, status: "trial", trial_inicio: hoje, trial_fim: somarDiasIso(hoje, 30) }).returning({ id: assinaturas.id });
        assinaturaId = nova.id;
        statusAtual = "trial";
        trialFim = somarDiasIso(hoje, 30);
      }

      let emTrialValido = statusAtual === "trial" && !!trialFim && trialFim >= hoje;

      if (statusAtual === "suspensa" && trialFim && trialFim >= hoje) {
        await tx.update(assinaturas).set({ status: "trial", bloqueada_em: null }).where(eq(assinaturas.id, assinaturaId));
        statusAtual = "trial";
        emTrialValido = true;
      }
      if (statusAtual === "trial" && !trialFim) {
        const novoTrialFim = somarDiasIso(hoje, 30);
        await tx.update(assinaturas).set({ status: "trial", trial_inicio: hoje, trial_fim: novoTrialFim }).where(eq(assinaturas.id, assinaturaId));
        emTrialValido = true;
      }

      if (!emTrialValido) {
        await tx.update(assinaturas).set({ status: "ativa", ciclo_inicio: hoje, ciclo_fim: somarDiasIso(hoje, 30) }).where(eq(assinaturas.id, assinaturaId));

        const [planoRow] = await tx.select({ valor: planos.valor }).from(planos).where(eq(planos.id, planoId)).limit(1);
        const valor = Number(planoRow?.valor ?? 50);

        const [cobrancaPendente] = await tx.select({ id: cobrancas.id }).from(cobrancas).where(and(eq(cobrancas.assinatura_id, assinaturaId), eq(cobrancas.status, "pendente"))).orderBy(desc(cobrancas.id)).limit(1);
        if (cobrancaPendente) {
          await tx.update(cobrancas).set({ status: "pago", pago_em: timestampFortaleza() }).where(eq(cobrancas.id, cobrancaPendente.id));
        } else {
          await tx.insert(cobrancas).values({ assinatura_id: assinaturaId, valor, vencimento: somarDiasIso(hoje, 30), status: "pago", pago_em: timestampFortaleza() });
        }
      }

      await tx.update(lojas).set({ ativo: true }).where(eq(lojas.id, lojaId));
      await tx.update(admins).set({ ativo: true }).where(eq(admins.loja_id, lojaId));
    });

    return { ok: true };
  } catch {
    return { ok: false, msg: "Erro ao atualizar a loja." };
  }
}

export async function suspenderLoja(lojaId: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (lojaId <= 0) return { ok: false, msg: "Ação inválida." };

  try {
    await withTransaction(async (tx) => {
      const [assinaturaRow] = await tx.select({ id: assinaturas.id, planoId: assinaturas.plano_id }).from(assinaturas).where(eq(assinaturas.loja_id, lojaId)).orderBy(desc(assinaturas.id)).limit(1);
      const planoId = await resolverPlanoParaAtivacao(lojaId, assinaturaRow?.planoId ?? 0);

      if (!assinaturaRow) {
        await tx.insert(assinaturas).values({ loja_id: lojaId, plano_id: planoId, status: "suspensa", bloqueada_em: timestampFortaleza() });
      } else {
        await tx.update(assinaturas).set({ status: "suspensa", bloqueada_em: timestampFortaleza() }).where(eq(assinaturas.id, assinaturaRow.id));
      }

      await tx.update(lojas).set({ ativo: false }).where(eq(lojas.id, lojaId));
      await tx.update(admins).set({ ativo: false }).where(eq(admins.loja_id, lojaId));
    });

    return { ok: true };
  } catch {
    return { ok: false, msg: "Erro ao atualizar a loja." };
  }
}
