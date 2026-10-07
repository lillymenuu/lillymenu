import "server-only";
import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, lojas, suporteMensagens } from "@/db/schema";
import { storageSaveArquivoBase64, storageDelete } from "@/db/queries/storage";

const EXTENSOES_FOTO = ["jpg", "jpeg", "png", "webp"];
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

/*
 * Dados reais do perfil do proprio superadmin logado (pagina /superadmin/perfil): nada aqui e
 * inventado — os "stats" vem de contagens reais (lojas ativas, mensagens de suporte respondidas),
 * e "outros administradores" lista de verdade quem mais tem acesso superadmin (perfil='superadmin'
 * na mesma tabela admins que os admins de loja, ver getSessaoSuperadmin em lib/session.ts).
 */

export type PerfilSuperadmin = {
  nome: string;
  email: string;
  foto: string | null;
  ativo: boolean;
  criadoEm: string | null;
  lojasAtivas: number;
  mensagensRespondidas: number;
  outrosSuperadmins: { id: number; nome: string; email: string }[];
};

export async function getPerfilSuperadmin(adminId: number): Promise<PerfilSuperadmin> {
  const [linha] = await db
    .select({ nome: admins.nome, email: admins.email, foto: admins.foto, ativo: admins.ativo, criadoEm: admins.criado_em })
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
    foto: linha?.foto ?? null,
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
  novaSenhaInput: string,
  fotoBase64Input: string,
  fotoExtInput: string,
  removerFoto: boolean
): Promise<{ ok: true } | { ok: false; msg: string }> {
  const nome = nomeInput.trim();
  const email = emailInput.trim().toLowerCase();
  const novaSenha = novaSenhaInput.trim();
  const fotoBase64 = fotoBase64Input.trim();
  const fotoExt = fotoExtInput.trim().toLowerCase();

  if (!nome) return { ok: false, msg: "Informe o nome." };
  if (!email || !email.includes("@")) return { ok: false, msg: "E-mail inválido." };
  if (novaSenha && novaSenha.length < 6) return { ok: false, msg: "A senha precisa ter pelo menos 6 caracteres." };
  if (fotoBase64 && !EXTENSOES_FOTO.includes(fotoExt)) return { ok: false, msg: "Foto inválida (use JPG, PNG ou WebP)." };

  const [atual] = await db.select({ foto: admins.foto }).from(admins).where(eq(admins.id, adminId)).limit(1);

  const campos: { nome: string; email: string; senha?: string; foto?: string | null } = { nome, email };
  if (novaSenha) campos.senha = await bcrypt.hash(novaSenha, 10);

  if (fotoBase64) {
    const novaFoto = await storageSaveArquivoBase64(fotoBase64, fotoExt, "perfil", "superadmin", null, TAMANHO_MAXIMO_FOTO);
    if (!novaFoto) return { ok: false, msg: "Erro ao salvar a foto (verifique o tamanho, máximo 5MB)." };
    campos.foto = novaFoto;
  } else if (removerFoto) {
    campos.foto = null;
  }

  try {
    await db.update(admins).set(campos).where(eq(admins.id, adminId));
    if ((fotoBase64 || removerFoto) && atual?.foto) await storageDelete(atual.foto);
    return { ok: true };
  } catch {
    return { ok: false, msg: "Não foi possível salvar — esse e-mail já pode estar em uso." };
  }
}
