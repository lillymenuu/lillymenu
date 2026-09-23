import "server-only";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, sql as rawSql } from "drizzle-orm";
import { db } from "@/db";
import { admins, adminApiTokens, lojas } from "@/db/schema";

/*
 * Autenticacao 100% no Neon — substitui o token Bearer que hoje vem do PHP
 * (admin/helpers/api_auth.php). Mesma logica: senha com bcrypt (compativel
 * com os hashes $2y$ que o PHP ja gravou), token opaco de 48 bytes, so o
 * hash (sha256) fica salvo, expira em 30 dias.
 */

export type AdminAutenticado = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  lojaId: number;
  lojaAtiva: boolean;
  ativo: boolean;
};

/**
 * Confere email/usuario + senha contra a tabela `admins` migrada. NAO checa
 * ativo/lojaAtiva aqui (igual auth_login.php): quem chama decide o codigo de
 * resposta (401 credencial invalida vs 403 conta/loja inativa), ja que o
 * fluxo do lojista distingue os dois casos e o do superadmin nao.
 */
export async function verificarCredenciais(login: string, senha: string): Promise<AdminAutenticado | null> {
  const loginNormalizado = login.trim().toLowerCase();

  const linhas = await db
    .select({
      id: admins.id,
      nome: admins.nome,
      email: admins.email,
      senha: admins.senha,
      perfil: admins.perfil,
      ativo: admins.ativo,
      lojaId: admins.loja_id,
      lojaAtiva: lojas.ativo,
    })
    .from(admins)
    .leftJoin(lojas, eq(lojas.id, admins.loja_id))
    .where(rawSql`lower(${admins.email}) = ${loginNormalizado} or lower(${admins.usuario}) = ${loginNormalizado}`)
    .limit(1);

  const admin = linhas[0];
  if (!admin || !admin.senha) return null;
  if (!bcrypt.compareSync(senha, admin.senha)) return null;

  return {
    id: admin.id,
    nome: admin.nome ?? "",
    email: admin.email ?? "",
    perfil: admin.perfil,
    lojaId: admin.lojaId,
    lojaAtiva: admin.lojaAtiva ?? false,
    ativo: admin.ativo ?? false,
  };
}

/** Igual a verificarCredenciais, mas so aceita perfil "superadmin" + ativo=1 (igual ao WHERE de superadmin_login.php: inativo cai no mesmo 401 generico, sem 403 separado). */
export async function verificarCredenciaisSuperadmin(login: string, senha: string): Promise<AdminAutenticado | null> {
  const admin = await verificarCredenciais(login, senha);
  if (!admin || admin.perfil !== "superadmin" || !admin.ativo) return null;
  return admin;
}

const DIAS_EXPIRACAO = 30;

/** Gera um token opaco (64 chars hex), guarda so o hash sha256 no banco. */
export async function criarSessao(adminId: number, lojaId: number): Promise<string> {
  const token = randomBytes(48).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const expiraEm = new Date(Date.now() + DIAS_EXPIRACAO * 24 * 60 * 60 * 1000);

  await db.insert(adminApiTokens).values({
    admin_id: adminId,
    loja_id: lojaId,
    token_hash: hash,
    expira_em: expiraEm.toISOString(),
  });

  return token;
}

/** Valida um token de sessao e devolve o admin autenticado, ou null. */
export async function validarSessao(token: string): Promise<AdminAutenticado | null> {
  if (!/^[a-f0-9]{96}$/i.test(token)) return null;
  const hash = createHash("sha256").update(token).digest("hex");

  const linhas = await db
    .select({
      id: admins.id,
      nome: admins.nome,
      email: admins.email,
      perfil: admins.perfil,
      ativo: admins.ativo,
      lojaId: adminApiTokens.loja_id,
      lojaAtiva: lojas.ativo,
    })
    .from(adminApiTokens)
    .innerJoin(admins, eq(admins.id, adminApiTokens.admin_id))
    .leftJoin(lojas, eq(lojas.id, adminApiTokens.loja_id))
    .where(and(eq(adminApiTokens.token_hash, hash), gt(adminApiTokens.expira_em, new Date().toISOString())))
    .limit(1);

  const admin = linhas[0];
  if (!admin || !admin.ativo) return null;

  return {
    id: admin.id,
    nome: admin.nome ?? "",
    email: admin.email ?? "",
    perfil: admin.perfil,
    lojaId: admin.lojaId,
    lojaAtiva: admin.lojaAtiva ?? false,
    ativo: admin.ativo ?? false,
  };
}

/** Encerra a sessao (logout). */
export async function revogarSessao(token: string): Promise<void> {
  if (!/^[a-f0-9]{96}$/i.test(token)) return;
  const hash = createHash("sha256").update(token).digest("hex");
  await db.delete(adminApiTokens).where(eq(adminApiTokens.token_hash, hash));
}
