import "server-only";
import { and, eq, ne, or } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { lojas, admins, configuracoes, assinaturas, planos } from "@/db/schema";
import bcrypt from "bcryptjs";

/* Equivalente de admin/api/v1/superadmin_loja_salvar.php: edita nome/admin/contato/trial de uma loja pelo superadmin. */

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SalvarLojaSuperadminInput = {
  lojaId: number;
  adminId?: number;
  nome: string;
  email: string;
  usuario: string;
  contato?: string;
  senha?: string;
  senha2?: string;
  trialInicio?: string;
  trialFim?: string;
};

export async function salvarLojaSuperadmin(input: SalvarLojaSuperadminInput): Promise<{ ok: true } | { ok: false; msg: string }> {
  const lojaId = input.lojaId;
  let adminId = input.adminId ?? 0;
  const nome = input.nome.trim();
  const email = input.email.trim();
  const usuario = input.usuario.trim();
  const contato = (input.contato ?? "").trim();
  const senha = input.senha ?? "";
  const senha2 = input.senha2 ?? "";
  const trialInicio = (input.trialInicio ?? "").trim();
  const trialFim = (input.trialFim ?? "").trim();

  if (trialInicio !== "" && !RE_DATA.test(trialInicio)) return { ok: false, msg: "Data de inicio do teste invalida." };
  if (trialFim !== "" && !RE_DATA.test(trialFim)) return { ok: false, msg: "Data de fim do teste invalida." };
  if (lojaId <= 0 || nome === "" || email === "" || usuario === "") return { ok: false, msg: "Preencha todos os campos obrigatorios." };
  if (!RE_EMAIL.test(email)) return { ok: false, msg: "Email invalido." };
  if (senha !== "" && senha !== senha2) return { ok: false, msg: "As senhas nao conferem." };
  if (senha !== "" && senha.length < 6) return { ok: false, msg: "A senha deve ter ao menos 6 caracteres." };

  try {
    if (adminId <= 0) {
      const [primeiro] = await db.select({ id: admins.id }).from(admins).where(eq(admins.loja_id, lojaId)).orderBy(admins.id).limit(1);
      adminId = primeiro?.id ?? 0;
    }

    if (adminId > 0) {
      const [dup] = await db.select({ id: admins.id }).from(admins).where(and(or(eq(admins.email, email), eq(admins.usuario, usuario)), ne(admins.id, adminId))).limit(1);
      if (dup) return { ok: false, msg: "Email ou usuario ja cadastrado." };
    }

    await withTransaction(async (tx) => {
      await tx.update(lojas).set({ nome }).where(eq(lojas.id, lojaId));

      if (adminId > 0) {
        await tx.update(admins).set({ nome, email, usuario }).where(and(eq(admins.id, adminId), eq(admins.loja_id, lojaId)));
        if (senha !== "") {
          const hash = await bcrypt.hash(senha, 10);
          await tx.update(admins).set({ senha: hash }).where(and(eq(admins.id, adminId), eq(admins.loja_id, lojaId)));
        }
      }

      const configs: Record<string, string> = { nome_loja: nome, loja_email: email };
      if (contato !== "") {
        configs.loja_contato = contato;
        configs.whatsapp_numero = contato;
      }
      for (const [chave, valor] of Object.entries(configs)) {
        await tx.insert(configuracoes).values({ loja_id: lojaId, chave, valor }).onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
      }

      const trialInicioDb = trialInicio !== "" ? trialInicio : null;
      const trialFimDb = trialFim !== "" ? trialFim : null;

      const [assinatura] = await tx.select({ id: assinaturas.id, status: assinaturas.status }).from(assinaturas).where(eq(assinaturas.loja_id, lojaId)).orderBy(assinaturas.id).limit(1);

      if (assinatura) {
        const statusAtual = (assinatura.status ?? "").trim().toLowerCase();
        const set: Partial<typeof assinaturas.$inferInsert> = { trial_inicio: trialInicioDb, trial_fim: trialFimDb };
        if ((trialInicioDb || trialFimDb) && statusAtual !== "trial") {
          set.status = "trial";
          set.ciclo_inicio = null;
          set.ciclo_fim = null;
          set.bloqueada_em = null;
        }
        await tx.update(assinaturas).set(set).where(eq(assinaturas.id, assinatura.id));
      } else if (trialInicioDb || trialFimDb) {
        const [primeiroPlano] = await tx.select({ id: planos.id }).from(planos).where(eq(planos.ativo, true)).orderBy(planos.id).limit(1);
        if (!primeiroPlano) throw new Error("Plano nao encontrado");
        await tx.insert(assinaturas).values({ loja_id: lojaId, plano_id: primeiroPlano.id, status: "trial", trial_inicio: trialInicioDb, trial_fim: trialFimDb, ciclo_inicio: null, ciclo_fim: null });
      }
    });

    return { ok: true };
  } catch {
    return { ok: false, msg: "Erro ao atualizar loja." };
  }
}
