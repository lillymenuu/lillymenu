import "server-only";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { garcons, garcomApiTokens } from "@/db/schema";

/*
 * Equivalente de public/api/garcom_login.php + garcom_logout.php: sessao do
 * app do garcom, separada da sessao do lojista (lm_token). Mesmo desenho de
 * @/db/queries/auth.ts (token opaco, so o hash sha256 fica salvo).
 */

export type GarcomAutenticado = { id: number; nome: string; lojaId: number };

/** Confere email + codigo de acesso (5 chars) contra a tabela `garcons`. */
export async function verificarCredenciaisGarcom(lojaId: number, email: string, codigo: string): Promise<GarcomAutenticado | null> {
  const emailNormalizado = email.trim().toLowerCase();
  if (!emailNormalizado || !codigo.trim()) return null;

  const [garcom] = await db
    .select({ id: garcons.id, nome: garcons.nome, codigoHash: garcons.codigo_acesso_hash, ativo: garcons.ativo })
    .from(garcons)
    .where(and(eq(garcons.loja_id, lojaId), eq(garcons.email, emailNormalizado)))
    .limit(1);

  if (!garcom || !garcom.ativo) return null;
  if (!bcrypt.compareSync(codigo.trim().toUpperCase(), garcom.codigoHash)) return null;

  return { id: garcom.id, nome: garcom.nome, lojaId };
}

const DIAS_EXPIRACAO = 30;

export async function criarSessaoGarcom(garcomId: number, lojaId: number): Promise<string> {
  const token = randomBytes(48).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const expiraEm = new Date(Date.now() + DIAS_EXPIRACAO * 24 * 60 * 60 * 1000);

  await db.insert(garcomApiTokens).values({ garcom_id: garcomId, loja_id: lojaId, token_hash: hash, expira_em: expiraEm.toISOString() });

  return token;
}

export async function validarSessaoGarcom(token: string): Promise<GarcomAutenticado | null> {
  if (!/^[a-f0-9]{96}$/i.test(token)) return null;
  const hash = createHash("sha256").update(token).digest("hex");

  const [linha] = await db
    .select({ id: garcons.id, nome: garcons.nome, ativo: garcons.ativo, lojaId: garcomApiTokens.loja_id })
    .from(garcomApiTokens)
    .innerJoin(garcons, eq(garcons.id, garcomApiTokens.garcom_id))
    .where(and(eq(garcomApiTokens.token_hash, hash), gt(garcomApiTokens.expira_em, new Date().toISOString())))
    .limit(1);

  if (!linha || !linha.ativo) return null;
  return { id: linha.id, nome: linha.nome, lojaId: linha.lojaId };
}

export async function revogarSessaoGarcom(token: string): Promise<void> {
  if (!/^[a-f0-9]{96}$/i.test(token)) return;
  const hash = createHash("sha256").update(token).digest("hex");
  await db.delete(garcomApiTokens).where(eq(garcomApiTokens.token_hash, hash));
}
