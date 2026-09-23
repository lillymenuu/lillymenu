import "server-only";
import { and, eq, ne, notInArray, sql, asc } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { admins, permissoesNiveis, permissoesUsuarios } from "@/db/schema";

/*
 * Equivalente de admin/api/v1/usuarios_listar.php, usuarios_salvar.php,
 * usuarios_excluir.php e usuarios_gerar_codigo.php: sub-admins da loja
 * (usuarios/permissoes) na tela de Configuracoes (/settings).
 *
 * O SHOW TABLES/SHOW COLUMNS defensivos do PHP (permissoes_niveis,
 * permissoes_usuarios, colunas ativo/loja_id/codigo_acesso podem nao
 * existir em instalacoes antigas) foram omitidos: o schema Neon ja
 * garante tudo isso.
 */

async function souAdminPrincipal(adminId: number, perfil: string): Promise<boolean> {
  if (perfil !== "admin") return false;
  const [linha] = await db.select({ senha: admins.senha }).from(admins).where(eq(admins.id, adminId)).limit(1);
  return Boolean(linha?.senha && linha.senha.trim() !== "");
}

const PERMS_MENU = [
  "menu.dashboard",
  "menu.pdv",
  "menu.gestor_pedidos",
  "menu.pedidos",
  "menu.produtos",
  "menu.estoque",
  "menu.clientes",
  "menu.relatorios",
  "menu.relatorios_fidelidade",
  "menu.controle_caixa",
  "menu.cupons",
  "menu.configuracoes",
];

const NIVEIS_PADRAO: Record<string, { nome: string; descricao: string; permissoes: string[] }> = {
  "nivel-1": { nome: "Nivel 1", descricao: "Acesso total ao sistema", permissoes: PERMS_MENU },
  "nivel-2": { nome: "Nivel 2", descricao: "Operador de caixa", permissoes: ["menu.pdv", "menu.gestor_pedidos", "menu.clientes"] },
  "nivel-3": { nome: "Nivel 3", descricao: "Consulta de relatorios", permissoes: ["menu.relatorios", "menu.relatorios_fidelidade"] },
};

/** Garante que nivel-1/2/3 existam em permissoes_niveis, e que tenham permissoes de menu (self-heal). */
async function garantirNiveisPadrao(): Promise<void> {
  for (const [slug, nivel] of Object.entries(NIVEIS_PADRAO)) {
    const [linha] = await db.select({ id: permissoesNiveis.id, nome: permissoesNiveis.nome, permissoesJson: permissoesNiveis.permissoes_json }).from(permissoesNiveis).where(eq(permissoesNiveis.slug, slug)).limit(1);

    let permissoesJson = linha?.permissoesJson;
    if (!linha) {
      permissoesJson = JSON.stringify(nivel.permissoes);
      await db.insert(permissoesNiveis).values({ nome: nivel.nome, slug, permissoes_json: permissoesJson });
      continue;
    }

    let temMenu = false;
    try {
      const decoded = JSON.parse(permissoesJson ?? "[]");
      if (Array.isArray(decoded)) temMenu = decoded.some((p) => typeof p === "string" && p.startsWith("menu."));
    } catch {
      temMenu = false;
    }
    if (!temMenu) {
      await db.update(permissoesNiveis).set({ permissoes_json: JSON.stringify(nivel.permissoes), atualizado_em: sql`now()` }).where(eq(permissoesNiveis.slug, slug));
    }
  }
}

function rotuloNivelUsuario(perfil: string, permissaoSlug: string | null, permissaoNome: string | null): string {
  if (permissaoSlug === "nivel-1") return "Admin";
  if (permissaoSlug === "nivel-2") return "Garçom";
  if (permissaoSlug) return permissaoNome ?? "Personalizada";
  return perfil === "admin" ? "Admin" : "Sem permissão";
}

export type UsuarioAdmin = {
  id: number;
  nome: string | null;
  email: string | null;
  usuario: string | null;
  perfil: string;
  ativo: boolean;
  codigoAcesso: string | null;
  permissaoId: number | null;
  permissaoNome: string | null;
  permissaoSlug: string | null;
  rotuloNivel: string;
};

export type ListarUsuariosResultado = {
  souAdminPrincipal: boolean;
  nivelAdminId: number;
  nivelGarcomId: number;
  niveis: { id: number; nome: string; slug: string }[];
  niveisPersonalizados: { id: number; nome: string; slug: string }[];
  usuarios: UsuarioAdmin[];
};

export async function listarUsuarios(lojaId: number, adminId: number, perfil: string): Promise<ListarUsuariosResultado> {
  await garantirNiveisPadrao();

  const niveisRaw = await db
    .select({ id: permissoesNiveis.id, nome: permissoesNiveis.nome, slug: permissoesNiveis.slug })
    .from(permissoesNiveis)
    .where(sql`${permissoesNiveis.slug} in ('nivel-1','nivel-2','nivel-3')`);
  const ordemSlug = ["nivel-1", "nivel-2", "nivel-3"];
  const niveis = [...niveisRaw].sort((a, b) => ordemSlug.indexOf(a.slug) - ordemSlug.indexOf(b.slug));
  const nivelAdminId = niveis.find((n) => n.slug === "nivel-1")?.id ?? 0;
  const nivelGarcomId = niveis.find((n) => n.slug === "nivel-2")?.id ?? 0;

  const niveisPersonalizados = await db
    .selectDistinct({ id: permissoesNiveis.id, nome: permissoesNiveis.nome, slug: permissoesNiveis.slug })
    .from(permissoesNiveis)
    .innerJoin(permissoesUsuarios, eq(permissoesUsuarios.permissao_id, permissoesNiveis.id))
    .innerJoin(admins, eq(admins.id, permissoesUsuarios.admin_id))
    .where(and(eq(admins.loja_id, lojaId), notInArray(permissoesNiveis.slug, ["nivel-1", "nivel-2"])))
    .orderBy(asc(permissoesNiveis.nome));

  const usuariosRaw = await db
    .select({
      id: admins.id,
      nome: admins.nome,
      email: admins.email,
      usuario: admins.usuario,
      perfil: admins.perfil,
      ativo: admins.ativo,
      codigoAcesso: admins.codigo_acesso,
      permissaoId: permissoesNiveis.id,
      permissaoNome: permissoesNiveis.nome,
      permissaoSlug: permissoesNiveis.slug,
    })
    .from(admins)
    .leftJoin(permissoesUsuarios, eq(permissoesUsuarios.admin_id, admins.id))
    .leftJoin(permissoesNiveis, eq(permissoesNiveis.id, permissoesUsuarios.permissao_id))
    .where(and(ne(admins.perfil, "superadmin"), eq(admins.ativo, true), eq(admins.loja_id, lojaId)))
    .orderBy(asc(admins.nome));

  return {
    souAdminPrincipal: await souAdminPrincipal(adminId, perfil),
    nivelAdminId,
    nivelGarcomId,
    niveis,
    niveisPersonalizados,
    usuarios: usuariosRaw.map((u) => ({
      ...u,
      ativo: u.ativo ?? true,
      rotuloNivel: rotuloNivelUsuario(u.perfil, u.permissaoSlug, u.permissaoNome),
    })),
  };
}

function perfilPorNivel(slug: string | null): string {
  if (slug === "nivel-1") return "admin";
  if (slug === "nivel-2") return "operador";
  return "garcom";
}

const ALFABETO_CODIGO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

async function gerarCodigoAcessoUnico(): Promise<string> {
  for (;;) {
    let codigo = "";
    for (let i = 0; i < 5; i++) codigo += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
    const [existe] = await db.select({ id: admins.id }).from(admins).where(eq(admins.codigo_acesso, codigo)).limit(1);
    if (!existe) return codigo;
  }
}

export type SalvarUsuarioInput = { id?: number; nome: string; email: string; permissaoId: number };

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function salvarUsuario(lojaId: number, adminId: number, perfil: string, input: SalvarUsuarioInput): Promise<{ ok: true; id: number; nome: string; codigoAcesso?: string } | { ok: false; msg: string }> {
  if (!(await souAdminPrincipal(adminId, perfil))) return { ok: false, msg: "Sem permissao" };

  const id = input.id && input.id > 0 ? input.id : 0;
  const nome = input.nome.trim();
  const email = input.email.trim();
  const permissaoId = input.permissaoId;

  if (nome === "" || email === "" || permissaoId <= 0) return { ok: false, msg: "Preencha os campos obrigatorios." };
  if (!RE_EMAIL.test(email)) return { ok: false, msg: "Informe um e-mail valido." };

  const [dup] = await db.select({ id: admins.id }).from(admins).where(and(eq(admins.email, email), ne(admins.id, id))).limit(1);
  if (dup) return { ok: false, msg: "Este e-mail ja esta em uso por outro usuario." };

  if (id > 0) {
    const [pertence] = await db.select({ id: admins.id }).from(admins).where(and(eq(admins.id, id), eq(admins.loja_id, lojaId))).limit(1);
    if (!pertence) return { ok: false, msg: "Usuario nao pertence a esta loja." };
  }

  const [nivel] = await db.select({ slug: permissoesNiveis.slug }).from(permissoesNiveis).where(eq(permissoesNiveis.id, permissaoId)).limit(1);
  const perfilNovo = perfilPorNivel(nivel?.slug ?? null);

  const codigoGerado = id === 0 ? await gerarCodigoAcessoUnico() : "";

  let idFinal = id;
  await withTransaction(async (tx) => {
    if (id > 0) {
      await tx.update(admins).set({ nome, email, perfil: perfilNovo }).where(and(eq(admins.id, id), eq(admins.loja_id, lojaId)));
    } else {
      const [novo] = await tx
        .insert(admins)
        .values({ nome, usuario: null, email, senha: null, codigo_acesso: codigoGerado !== "" ? codigoGerado : null, perfil: perfilNovo, ativo: true, loja_id: lojaId })
        .returning({ id: admins.id });
      idFinal = novo.id;
    }

    await tx.delete(permissoesUsuarios).where(eq(permissoesUsuarios.admin_id, idFinal));
    if (permissaoId > 0) {
      await tx.insert(permissoesUsuarios).values({ permissao_id: permissaoId, admin_id: idFinal });
    }
  });

  return codigoGerado !== "" ? { ok: true, id: idFinal, nome, codigoAcesso: codigoGerado } : { ok: true, id: idFinal, nome };
}

export async function excluirUsuario(lojaId: number, adminIdLogado: number, perfil: string, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (!["admin", "gerente"].includes(perfil)) return { ok: false, msg: "Sem permissao" };
  if (id <= 0) return { ok: false, msg: "Usuario invalido." };

  const [pertence] = await db.select({ id: admins.id }).from(admins).where(and(eq(admins.id, id), eq(admins.loja_id, lojaId))).limit(1);
  if (!pertence) return { ok: false, msg: "Usuario nao pertence a esta loja." };

  if (adminIdLogado === id) return { ok: false, msg: "Nao e possivel excluir o usuario logado." };

  await withTransaction(async (tx) => {
    await tx.delete(permissoesUsuarios).where(eq(permissoesUsuarios.admin_id, id));
    await tx.update(admins).set({ ativo: false }).where(and(eq(admins.id, id), eq(admins.loja_id, lojaId)));
  });

  return { ok: true };
}

export async function gerarCodigoAcesso(lojaId: number, adminId: number, perfil: string, id: number): Promise<{ ok: true; codigoAcesso: string } | { ok: false; msg: string }> {
  if (!(await souAdminPrincipal(adminId, perfil))) return { ok: false, msg: "Sem permissao" };
  if (id <= 0) return { ok: false, msg: "Usuario invalido." };

  const [alvo] = await db.select({ email: admins.email }).from(admins).where(and(eq(admins.id, id), eq(admins.loja_id, lojaId))).limit(1);
  if (!alvo) return { ok: false, msg: "Usuario nao pertence a esta loja." };
  if (!alvo.email || alvo.email.trim() === "") return { ok: false, msg: "Cadastre um e-mail para este usuario antes de gerar o codigo de acesso." };

  const codigoGerado = await gerarCodigoAcessoUnico();
  await db.update(admins).set({ codigo_acesso: codigoGerado }).where(and(eq(admins.id, id), eq(admins.loja_id, lojaId)));

  return { ok: true, codigoAcesso: codigoGerado };
}
