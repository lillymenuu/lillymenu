import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, lojas } from "@/db/schema";
import type { AdminAutenticado } from "@/db/queries/auth";

/*
 * Equivalente de admin/google_callback.php: acha o admin pelo e-mail
 * verificado do Google, vincula o google_id na primeira vez e reativa o
 * admin se a loja estiver ativa. Nao cria conta nova (igual ao PHP).
 */

export type ResultadoGoogle =
  | { ok: true; admin: AdminAutenticado; assinaturaBloqueada: boolean }
  | { ok: false; erro: "google_sem_conta" | "google_inativa" };

export async function loginComGoogle(email: string, googleId: string): Promise<ResultadoGoogle> {
  const [linha] = await db
    .select({ id: admins.id, nome: admins.nome, email: admins.email, perfil: admins.perfil, ativo: admins.ativo, lojaId: admins.loja_id, googleId: admins.google_id, lojaAtiva: lojas.ativo })
    .from(admins)
    .leftJoin(lojas, eq(lojas.id, admins.loja_id))
    .where(sql`lower(${admins.email}) = lower(${email})`)
    .limit(1);

  if (!linha || linha.perfil === "superadmin") return { ok: false, erro: "google_sem_conta" };

  if (!linha.googleId) await db.update(admins).set({ google_id: googleId }).where(eq(admins.id, linha.id));

  const lojaAtiva = linha.lojaAtiva !== false;
  let adminAtivo = linha.ativo;

  /*
   * lojaAtiva=false por assinatura vencida (bloquearSeAssinaturaExpirada) NUNCA desativa
   * admin.ativo -- so um bloqueio "de verdade" (suspenderLoja, manual do superadmin) desativa
   * os dois juntos. Entao so reativa automaticamente o admin individual quando a loja em si
   * esta ok (comportamento pre-existente); loja bloqueada por assinatura passa direto, sem
   * reativar nada, pra chegar em /plan-details e pagar o Pix.
   */
  if (lojaAtiva && !adminAtivo) {
    await db.update(admins).set({ ativo: true }).where(eq(admins.id, linha.id));
    adminAtivo = true;
  }
  if (!adminAtivo) return { ok: false, erro: "google_inativa" };

  return {
    ok: true,
    admin: { id: linha.id, nome: linha.nome ?? "", email: linha.email ?? "", perfil: linha.perfil, lojaId: linha.lojaId, lojaAtiva, ativo: true },
    assinaturaBloqueada: !lojaAtiva,
  };
}
