import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, permissoesNiveis, permissoesUsuarios } from "@/db/schema";
import { souAdminPrincipal } from "@/db/queries/usuariosAdmin";
import { CHAVES_PERMISSOES, NIVEIS_PADRAO_INFO, type NivelAcesso } from "@/lib/permissoes";

/*
 * Niveis de acesso da loja (tela /settings/permissions): os 3 padrao do sistema (loja_id null,
 * slug nivel-1/2/3, so leitura) e os personalizados da propria loja (loja_id = loja).
 * Toda leitura/escrita filtra pela loja: uma loja nunca ve nem altera nivel de outra.
 */

const SLUGS_PADRAO = Object.keys(NIVEIS_PADRAO_INFO);

/** Nivel visivel pra loja: padrao do sistema ou personalizado dela. */
const visivelParaLoja = (lojaId: number) =>
  or(and(isNull(permissoesNiveis.loja_id), inArray(permissoesNiveis.slug, SLUGS_PADRAO)), eq(permissoesNiveis.loja_id, lojaId));

function lerPermissoes(json: string): string[] {
  try {
    const lista = JSON.parse(json) as unknown;
    return Array.isArray(lista) ? lista.map(String).filter((k) => CHAVES_PERMISSOES.includes(k)) : [];
  } catch {
    return [];
  }
}

export async function listarNiveisAcesso(lojaId: number): Promise<NivelAcesso[]> {
  const linhas = await db
    .select({
      id: permissoesNiveis.id,
      nome: permissoesNiveis.nome,
      slug: permissoesNiveis.slug,
      permissoesJson: permissoesNiveis.permissoes_json,
      lojaId: permissoesNiveis.loja_id,
    })
    .from(permissoesNiveis)
    .where(visivelParaLoja(lojaId));

  /* Quantos usuarios ativos DESTA loja usam cada nivel (os padrao sao compartilhados entre lojas). */
  const contagens = await db
    .select({ permissaoId: permissoesUsuarios.permissao_id, total: sql<string>`count(*)` })
    .from(permissoesUsuarios)
    .innerJoin(admins, eq(admins.id, permissoesUsuarios.admin_id))
    .where(and(eq(admins.loja_id, lojaId), eq(admins.ativo, true)))
    .groupBy(permissoesUsuarios.permissao_id);
  const usuariosPorNivel = new Map(contagens.map((c) => [c.permissaoId, Number(c.total)]));

  const niveis = linhas.map((l): NivelAcesso => {
    const padrao = l.lojaId === null ? NIVEIS_PADRAO_INFO[l.slug] : undefined;
    return {
      id: l.id,
      nome: padrao?.nome ?? l.nome,
      padrao: Boolean(padrao),
      acessoTotal: padrao?.acessoTotal ?? false,
      descricao: padrao?.descricao ?? "",
      permissoes: padrao?.acessoTotal ? [...CHAVES_PERMISSOES] : lerPermissoes(l.permissoesJson),
      usuarios: usuariosPorNivel.get(l.id) ?? 0,
    };
  });

  /* Padrao primeiro (na ordem nivel-1, 2, 3), depois os personalizados por nome. */
  const ordem = (n: NivelAcesso) => (n.padrao ? linhas.find((l) => l.id === n.id)!.slug : "z");
  return niveis.sort((a, b) => ordem(a).localeCompare(ordem(b)) || a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterNivelAcesso(lojaId: number, id: number): Promise<NivelAcesso | null> {
  if (!id) return null;
  const niveis = await listarNiveisAcesso(lojaId);
  return niveis.find((n) => n.id === id) ?? null;
}

/** O nivel pode ser atribuido a um usuario desta loja? (padrao ou personalizado dela) */
export async function nivelPertenceALoja(lojaId: number, id: number): Promise<boolean> {
  const [linha] = await db
    .select({ id: permissoesNiveis.id })
    .from(permissoesNiveis)
    .where(and(eq(permissoesNiveis.id, id), visivelParaLoja(lojaId)))
    .limit(1);
  return Boolean(linha);
}

type Resultado = { ok: true; id: number } | { ok: false; msg: string };

export async function salvarNivelAcesso(
  lojaId: number,
  adminId: number,
  perfil: string,
  input: { id?: number; nome: string; permissoes: string[] }
): Promise<Resultado> {
  if (!(await souAdminPrincipal(adminId, perfil))) return { ok: false, msg: "Apenas o administrador principal pode gerenciar permissões." };

  const id = input.id && input.id > 0 ? input.id : 0;
  const nome = input.nome.trim().replace(/\s+/g, " ");
  if (nome.length < 2) return { ok: false, msg: "Informe o nome do nível de acesso." };
  if (nome.length > 60) return { ok: false, msg: "O nome pode ter no máximo 60 caracteres." };

  /* Só chaves conhecidas, sem repetir. Sem nenhuma, o usuario ficaria sem acesso a nada. */
  const permissoes = [...new Set(input.permissoes.filter((k) => CHAVES_PERMISSOES.includes(k)))];
  if (permissoes.length === 0) return { ok: false, msg: "Selecione pelo menos uma permissão." };

  const nomesReservados = Object.values(NIVEIS_PADRAO_INFO).map((n) => n.nome.toLowerCase());
  if (nomesReservados.includes(nome.toLowerCase())) return { ok: false, msg: "Esse nome já é usado por uma permissão padrão." };

  const [duplicado] = await db
    .select({ id: permissoesNiveis.id })
    .from(permissoesNiveis)
    .where(and(eq(permissoesNiveis.loja_id, lojaId), sql`lower(${permissoesNiveis.nome}) = ${nome.toLowerCase()}`, ne(permissoesNiveis.id, id)))
    .limit(1);
  if (duplicado) return { ok: false, msg: "Já existe um nível de acesso com esse nome." };

  const permissoesJson = JSON.stringify(permissoes);

  if (id > 0) {
    /* So edita personalizado da propria loja (os padrao tem loja_id null e nao casam aqui). */
    const atualizados = await db
      .update(permissoesNiveis)
      .set({ nome, permissoes_json: permissoesJson, atualizado_em: sql`now()` })
      .where(and(eq(permissoesNiveis.id, id), eq(permissoesNiveis.loja_id, lojaId)))
      .returning({ id: permissoesNiveis.id });
    if (atualizados.length === 0) return { ok: false, msg: "Permissões padrão do sistema não podem ser editadas." };
    return { ok: true, id };
  }

  const [novo] = await db
    .insert(permissoesNiveis)
    .values({ nome, slug: `loja-${lojaId}-${randomUUID().slice(0, 8)}`, permissoes_json: permissoesJson, loja_id: lojaId })
    .returning({ id: permissoesNiveis.id });
  return { ok: true, id: novo.id };
}

export async function excluirNivelAcesso(lojaId: number, adminId: number, perfil: string, id: number): Promise<Resultado> {
  if (!(await souAdminPrincipal(adminId, perfil))) return { ok: false, msg: "Apenas o administrador principal pode gerenciar permissões." };

  const [nivel] = await db
    .select({ id: permissoesNiveis.id })
    .from(permissoesNiveis)
    .where(and(eq(permissoesNiveis.id, id), eq(permissoesNiveis.loja_id, lojaId)))
    .limit(1);
  if (!nivel) return { ok: false, msg: "Permissões padrão do sistema não podem ser excluídas." };

  const [emUso] = await db
    .select({ total: sql<string>`count(*)` })
    .from(permissoesUsuarios)
    .innerJoin(admins, eq(admins.id, permissoesUsuarios.admin_id))
    .where(and(eq(permissoesUsuarios.permissao_id, id), eq(admins.ativo, true)));
  const total = Number(emUso?.total ?? 0);
  if (total > 0) {
    return { ok: false, msg: `Há ${total} usuário(s) com este nível de acesso. Troque o nível deles em Usuários antes de excluir.` };
  }

  await db.delete(permissoesUsuarios).where(eq(permissoesUsuarios.permissao_id, id));
  await db.delete(permissoesNiveis).where(and(eq(permissoesNiveis.id, id), eq(permissoesNiveis.loja_id, lojaId)));
  return { ok: true, id };
}
