import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { enviarEmail } from "@/lib/email";
import { validarSenhaForte } from "@/lib/senha";

/*
 * Equivalente de admin/reset_request.php + admin/reset_save.php: pedido de
 * redefinicao de senha por e-mail. Mesmo desenho do legado (token opaco em
 * admins.reset_token/reset_expira, expira em 1h), mas o link agora aponta
 * pra /reset-senha (Next.js) em vez de admin/reset.php.
 */

const EXPIRACAO_MS = 60 * 60 * 1000;
const TOKEN_REGEX = /^[a-f0-9]{64}$/i;

function emailResetHtml(nome: string, link: string): string {
  return `
    <p>Olá, ${nome}!</p>
    <p>Recebemos um pedido para redefinir a senha da sua conta no LillyMenu.</p>
    <p><a href="${link}">Redefinir senha</a></p>
    <p>Esse link expira em 1 hora. Se você não pediu essa redefinição, pode ignorar este e-mail — sua senha atual continua valendo.</p>
  `;
}

/* Sempre "silenciosa" (nao revela se o e-mail existe), igual ao legado. */
export async function solicitarResetSenha(emailInput: string): Promise<void> {
  const email = emailInput.trim().toLowerCase();
  if (email === "") return;

  const [admin] = await db
    .select({ id: admins.id, nome: admins.nome })
    .from(admins)
    .where(and(sql`lower(${admins.email}) = ${email}`, eq(admins.ativo, true)))
    .limit(1);
  if (!admin) return;

  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + EXPIRACAO_MS).toISOString();
  await db.update(admins).set({ reset_token: token, reset_expira: expira }).where(eq(admins.id, admin.id));

  const link = `${process.env.NEXT_PUBLIC_APP_URL || "https://lillymenu.com"}/reset-senha?token=${token}`;
  await enviarEmail(email, "Redefinição de senha - LillyMenu", emailResetHtml(admin.nome || "usuário", link));
}

export async function validarTokenReset(token: string): Promise<boolean> {
  if (!TOKEN_REGEX.test(token)) return false;
  const [admin] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(and(eq(admins.reset_token, token), gt(admins.reset_expira, new Date().toISOString())))
    .limit(1);
  return !!admin;
}

export async function salvarNovaSenha(token: string, senha: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (!TOKEN_REGEX.test(token)) return { ok: false, msg: "Link inválido ou expirado." };
  const erroSenha = validarSenhaForte(senha);
  if (erroSenha) return { ok: false, msg: erroSenha };

  const [admin] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(and(eq(admins.reset_token, token), gt(admins.reset_expira, new Date().toISOString())))
    .limit(1);
  if (!admin) return { ok: false, msg: "Link inválido ou expirado." };

  const senhaHash = bcrypt.hashSync(senha, 10);
  await db.update(admins).set({ senha: senhaHash, reset_token: null, reset_expira: null }).where(eq(admins.id, admin.id));
  return { ok: true };
}
