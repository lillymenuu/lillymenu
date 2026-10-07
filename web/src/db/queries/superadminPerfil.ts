import "server-only";
import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, lojas, suporteMensagens } from "@/db/schema";

/*
 * Dados reais do perfil do proprio superadmin logado (pagina /superadmin/perfil): nada aqui e
 * inventado — os "stats" vem de contagens reais (lojas ativas, mensagens de suporte respondidas),
 * e "outros administradores" lista de verdade quem mais tem acesso superadmin (perfil='superadmin'
 * na mesma tabela admins que os admins de loja, ver getSessaoSuperadmin em lib/session.ts).
 */

export type PerfilSuperadmin = {
  nome: string;
  email: string;
  ativo: boolean;
  criadoEm: string | null;
  lojasAtivas: number;
  mensagensRespondidas: number;
  outrosSuperadmins: { id: number; nome: string; email: string }[];
};

export async function getPerfilSuperadmin(adminId: number): Promise<PerfilSuperadmin> {
  const [linha] = await db
    .select({ nome: admins.nome, email: admins.email, ativo: admins.ativo, criadoEm: admins.criado_em })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  const [{ n: lojasAtivas }] = await db.select({ n: sql<string>`count(*)` }).from(lojas).where(eq(lojas.ativo, true));
  const [{ n: mensagensRespondidas }] = await db
    .select({ n: sql<string>`count(*)` })
    .from(suporteMensagens)
    .where(eq(suporteMensagens.remetente, "suporte"));

  const outros = await db
    .select({ id: admins.id, nome: admins.nome, email: admins.email })
    .from(admins)
    .where(and(eq(admins.perfil, "superadmin"), ne(admins.id, adminId), eq(admins.ativo, true)));

  return {
    nome: linha?.nome ?? "",
    email: linha?.email ?? "",
    ativo: linha?.ativo ?? true,
    criadoEm: linha?.criadoEm ?? null,
    lojasAtivas: Number(lojasAtivas),
    mensagensRespondidas: Number(mensagensRespondidas),
    outrosSuperadmins: outros.map((o) => ({ id: o.id, nome: o.nome ?? "Sem nome", email: o.email ?? "" })),
  };
}

export async function atualizarPerfilSuperadmin(
  adminId: number,
  nomeInput: string,
  emailInput: string,
  novaSenhaInput: string
): Promise<{ ok: true } | { ok: false; msg: string }> {
  const nome = nomeInput.trim();
  const email = emailInput.trim().toLowerCase();
  const novaSenha = novaSenhaInput.trim();

  if (!nome) return { ok: false, msg: "Informe o nome." };
  if (!email || !email.includes("@")) return { ok: false, msg: "E-mail inválido." };
  if (novaSenha && novaSenha.length < 6) return { ok: false, msg: "A senha precisa ter pelo menos 6 caracteres." };

  const campos: { nome: string; email: string; senha?: string } = { nome, email };
  if (novaSenha) campos.senha = await bcrypt.hash(novaSenha, 10);

  try {
    await db.update(admins).set(campos).where(eq(admins.id, adminId));
    return { ok: true };
  } catch {
    return { ok: false, msg: "Não foi possível salvar — esse e-mail já pode estar em uso." };
  }
}
