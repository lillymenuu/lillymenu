import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { assinaturas, categorias, combos, midiaPareamentos, midiaTvs, planos, produtos as tabelaProdutos } from "@/db/schema";
import { lojaPublicaBloqueada } from "@/db/queries/assinatura";
import { montarCatalogoLoja } from "@/db/queries/catalogo";
import { montarPerfilLoja } from "@/db/queries/lojaPerfil";
import {
  ALFABETO_CODIGO,
  TAMANHO_CODIGO,
  TV_ONLINE_SEGUNDOS,
  normalizarConfigTv,
  type CatalogoTv,
  type CategoriaEscolhaTv,
  type ConfigTv,
  type LayoutTv,
  type ProdutoTv,
  type TvAdmin,
} from "@/lib/midiaIndoor";

/*
 * Midia Indoor - Menu Digital. Fluxo de pareamento:
 *  1. A TV abre /tv e cria um pareamento (codigo curto + segredo que so ela conhece), valido por 10 min.
 *  2. O QR da TV leva o admin a /tv/conectar/<codigo>; ao confirmar, a TV e criada na loja.
 *  3. A TV consulta o status com o segredo e recebe o token fixo, usado dali em diante pra ler o catalogo.
 */

export const CHAVE_RECURSO_MIDIA = "menu.midia_indoor";
const PAREAMENTO_MINUTOS = 10;

function gerarCodigo(): string {
  let s = "";
  for (let i = 0; i < TAMANHO_CODIGO; i++) s += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  return s;
}

/** Recurso liberado no plano da loja (sem lista de recursos no plano = tudo liberado, igual ao sidebar). */
export async function lojaPlanoTemRecurso(lojaId: number, chave: string): Promise<boolean> {
  const [ass] = await db
    .select({ recursosJson: planos.recursos_json })
    .from(assinaturas)
    .leftJoin(planos, eq(planos.id, assinaturas.plano_id))
    .where(eq(assinaturas.loja_id, lojaId))
    .orderBy(desc(assinaturas.id))
    .limit(1);
  if (!ass?.recursosJson) return true;
  try {
    const lista = JSON.parse(ass.recursosJson) as unknown;
    return !Array.isArray(lista) || lista.map(String).includes(chave);
  } catch {
    return true;
  }
}

/* ---------- Pareamento ---------- */

export async function criarPareamento(): Promise<{ codigo: string; segredo: string; expiraEmSegundos: number }> {
  /* Limpa pareamentos vencidos de vez em quando, pra tabela nao crescer. */
  await db.delete(midiaPareamentos).where(sql`${midiaPareamentos.expira_em} < now() - interval '1 day'`);

  const segredo = randomBytes(24).toString("hex");
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const codigo = gerarCodigo();
    const inseridos = await db
      .insert(midiaPareamentos)
      .values({ codigo, segredo, expira_em: sql`now() + make_interval(mins => ${PAREAMENTO_MINUTOS})` })
      .onConflictDoNothing()
      .returning({ id: midiaPareamentos.id });
    if (inseridos.length > 0) return { codigo, segredo, expiraEmSegundos: PAREAMENTO_MINUTOS * 60 };
  }
  throw new Error("Nao foi possivel gerar o codigo de pareamento.");
}

export type StatusPareamento = { status: "aguardando" } | { status: "expirado" } | { status: "conectado"; token: string };

/** Consultado pela TV (com o segredo) ate o admin confirmar. */
export async function statusPareamento(codigo: string, segredo: string): Promise<StatusPareamento> {
  const [p] = await db
    .select({ tvId: midiaPareamentos.tv_id, expirado: sql<boolean>`${midiaPareamentos.expira_em} < now()` })
    .from(midiaPareamentos)
    .where(and(eq(midiaPareamentos.codigo, codigo), eq(midiaPareamentos.segredo, segredo)))
    .limit(1);
  if (!p) return { status: "expirado" };
  if (p.tvId) {
    const [tv] = await db.select({ token: midiaTvs.token }).from(midiaTvs).where(eq(midiaTvs.id, p.tvId)).limit(1);
    if (!tv) return { status: "expirado" };
    /* Entregue o token, o pareamento nao serve mais pra nada. */
    await db.delete(midiaPareamentos).where(eq(midiaPareamentos.codigo, codigo));
    return { status: "conectado", token: tv.token };
  }
  return p.expirado ? { status: "expirado" } : { status: "aguardando" };
}

/** Admin confirma o codigo mostrado na TV: cria a TV na loja e vincula ao pareamento. */
export async function confirmarPareamento(lojaId: number, codigo: string, nome: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  const nomeTv = nome.trim().slice(0, 60) || "TV";
  const [p] = await db
    .select({ id: midiaPareamentos.id, tvId: midiaPareamentos.tv_id, expirado: sql<boolean>`${midiaPareamentos.expira_em} < now()` })
    .from(midiaPareamentos)
    .where(eq(midiaPareamentos.codigo, codigo))
    .limit(1);
  if (!p || p.expirado) return { ok: false, msg: "Código inválido ou expirado. Recarregue a tela da TV para gerar outro." };
  if (p.tvId) return { ok: false, msg: "Esta TV já foi conectada." };

  const [tv] = await db
    .insert(midiaTvs)
    .values({ loja_id: lojaId, nome: nomeTv, token: randomBytes(24).toString("hex") })
    .returning({ id: midiaTvs.id });
  /* Condicional em tv_id nulo: se dois celulares confirmarem juntos, so um vence. */
  const vinculados = await db
    .update(midiaPareamentos)
    .set({ tv_id: tv.id })
    .where(and(eq(midiaPareamentos.id, p.id), isNull(midiaPareamentos.tv_id)))
    .returning({ id: midiaPareamentos.id });
  if (vinculados.length === 0) {
    await db.delete(midiaTvs).where(eq(midiaTvs.id, tv.id));
    return { ok: false, msg: "Esta TV já foi conectada." };
  }
  return { ok: true };
}

/* ---------- TVs da loja (Admin) ---------- */

export async function listarTvs(lojaId: number): Promise<(TvAdmin & { online: boolean })[]> {
  const linhas = await db
    .select({
      id: midiaTvs.id,
      nome: midiaTvs.nome,
      layout: midiaTvs.layout,
      config: midiaTvs.config,
      ultimoAcesso: midiaTvs.ultimo_acesso,
      criadoEm: midiaTvs.criado_em,
      online: sql<boolean>`coalesce(${midiaTvs.ultimo_acesso} > now() - make_interval(secs => ${TV_ONLINE_SEGUNDOS}), false)`,
    })
    .from(midiaTvs)
    .where(eq(midiaTvs.loja_id, lojaId))
    .orderBy(asc(midiaTvs.id));
  return linhas.map((l) => ({ ...l, config: normalizarConfigTv(l.config) }));
}

export async function salvarTv(
  lojaId: number,
  tvId: number,
  dados: { nome: string; layout: LayoutTv; config: ConfigTv }
): Promise<{ ok: true } | { ok: false; msg: string }> {
  const nome = dados.nome.trim().slice(0, 60);
  if (!nome) return { ok: false, msg: "Informe o nome da TV." };
  const atualizadas = await db
    .update(midiaTvs)
    .set({ nome, layout: dados.layout, config: normalizarConfigTv(dados.config) })
    .where(and(eq(midiaTvs.id, tvId), eq(midiaTvs.loja_id, lojaId)))
    .returning({ id: midiaTvs.id });
  return atualizadas.length ? { ok: true } : { ok: false, msg: "TV não encontrada." };
}

/** Para ou retoma a exibicao sem mexer no resto da configuracao. */
export async function definirPausaTv(lojaId: number, tvId: number, pausada: boolean): Promise<boolean> {
  const linhas = await db
    .update(midiaTvs)
    .set({ config: sql`${midiaTvs.config} || jsonb_build_object('pausada', ${pausada}::boolean)` })
    .where(and(eq(midiaTvs.id, tvId), eq(midiaTvs.loja_id, lojaId)))
    .returning({ id: midiaTvs.id });
  return linhas.length > 0;
}

export async function removerTv(lojaId: number, tvId: number): Promise<void> {
  await db.delete(midiaTvs).where(and(eq(midiaTvs.id, tvId), eq(midiaTvs.loja_id, lojaId)));
}

/* ---------- Lista "Escolher produtos" (Admin) ---------- */

function urlImagem(caminho: string | null, baseUrl: string): string | null {
  if (!caminho) return null;
  if (/^https?:\/\//i.test(caminho) || caminho.startsWith("/")) return caminho;
  return `${baseUrl.replace(/\/$/, "")}/${caminho}`;
}

/** Produtos e combos ativos agrupados por categoria (na ordem do cardapio), pra escolher o que vai pra TV. */
export async function listarItensParaTv(lojaId: number, baseUrl: string): Promise<CategoriaEscolhaTv[]> {
  const precoProduto = sql<number>`case when ${tabelaProdutos.promo_desativado} = false and ${tabelaProdutos.preco_promocional} > 0 then ${tabelaProdutos.preco_promocional} else ${tabelaProdutos.preco} end`;
  const precoCombo = sql<number>`case when ${combos.promo_desativado} = false and ${combos.preco_promocional} > 0 then ${combos.preco_promocional} else ${combos.preco} end`;

  const [cats, prods, cmbs] = await Promise.all([
    db
      .select({ id: categorias.id, nome: categorias.nome })
      .from(categorias)
      .where(and(eq(categorias.loja_id, lojaId), eq(categorias.ativo, true)))
      .orderBy(sql`${categorias.ordem} is null`, categorias.ordem, categorias.nome),
    db
      .select({ id: tabelaProdutos.id, nome: tabelaProdutos.nome, imagem: tabelaProdutos.imagem, categoriaId: tabelaProdutos.categoria_id, preco: precoProduto })
      .from(tabelaProdutos)
      .where(and(eq(tabelaProdutos.loja_id, lojaId), eq(tabelaProdutos.ativo, true)))
      .orderBy(sql`${tabelaProdutos.ordem} is null`, tabelaProdutos.ordem, tabelaProdutos.nome),
    db
      .select({ id: combos.id, nome: combos.nome, imagem: combos.imagem, categoriaId: combos.categoria_id, preco: precoCombo })
      .from(combos)
      .where(and(eq(combos.loja_id, lojaId), eq(combos.ativo, true)))
      .orderBy(sql`${combos.ordem} is null`, combos.ordem, combos.nome),
  ]);

  return cats
    .map((c) => ({
      id: c.id,
      nome: c.nome ?? "Sem nome",
      itens: [
        ...prods
          .filter((p) => p.categoriaId === c.id)
          .map((p) => ({ id: `p${p.id}`, nome: p.nome ?? "Produto", imagem: urlImagem(p.imagem, baseUrl), preco: Number(p.preco) || 0, combo: false })),
        ...cmbs
          .filter((p) => p.categoriaId === c.id)
          .map((p) => ({ id: `c${p.id}`, nome: p.nome ?? "Combo", imagem: urlImagem(p.imagem, baseUrl), preco: Number(p.preco) || 0, combo: true })),
      ],
    }))
    .filter((c) => c.itens.length > 0);
}

/* ---------- Catalogo (player da TV) ---------- */

export type CatalogoTvResultado = { ok: true; catalogo: CatalogoTv } | { ok: false; motivo: "tv_removida" | "loja_bloqueada" | "sem_recurso" };

export async function catalogoDaTv(token: string, baseUrl: string): Promise<CatalogoTvResultado> {
  const [tv] = await db
    .select({ id: midiaTvs.id, lojaId: midiaTvs.loja_id, nome: midiaTvs.nome, layout: midiaTvs.layout, config: midiaTvs.config })
    .from(midiaTvs)
    .where(eq(midiaTvs.token, token))
    .limit(1);
  if (!tv) return { ok: false, motivo: "tv_removida" };

  await db.update(midiaTvs).set({ ultimo_acesso: sql`now()` }).where(eq(midiaTvs.id, tv.id));

  if (await lojaPublicaBloqueada(tv.lojaId)) return { ok: false, motivo: "loja_bloqueada" };
  if (!(await lojaPlanoTemRecurso(tv.lojaId, CHAVE_RECURSO_MIDIA))) return { ok: false, motivo: "sem_recurso" };

  const config = normalizarConfigTv(tv.config);
  const [perfil, catalogo] = await Promise.all([montarPerfilLoja(tv.lojaId, { baseUrl }), montarCatalogoLoja(tv.lojaId, baseUrl)]);

  const porProduto = config.modo === "produtos";
  const filtroCategorias = new Set(porProduto ? [] : config.categorias);
  const escolhidos = new Set(config.produtos);
  const produtos: ProdutoTv[] = [];
  for (const cat of catalogo.categorias) {
    if (filtroCategorias.size > 0 && !filtroCategorias.has(cat.id)) continue;
    for (const p of catalogo.produtosPorCategoria[cat.id] ?? []) {
      produtos.push({
        id: `p${p.id}`,
        nome: p.nome,
        descricao: p.descricao,
        imagem: p.imagem || null,
        categoria: cat.nome,
        categoriaId: cat.id,
        precoBase: p.precoBase,
        precoFinal: p.precoFinal,
        emPromo: p.emPromo,
        descPct: p.descPct,
        esgotado: p.esgotado,
        destaque: p.destaque,
      });
    }
    for (const c of catalogo.combosPorCategoria[cat.id] ?? []) {
      produtos.push({
        id: `c${c.id}`,
        nome: c.nome,
        descricao: c.descricao,
        imagem: c.imagem || null,
        categoria: cat.nome,
        categoriaId: cat.id,
        precoBase: c.precoBase,
        precoFinal: c.precoFinal,
        emPromo: c.emPromo,
        descPct: c.descPct,
        esgotado: false,
        destaque: false,
      });
    }
  }

  const filtrados = produtos.filter(
    (p) => (!porProduto || escolhidos.has(p.id)) && (!config.somenteComFoto || p.imagem) && (!config.esconderEsgotados || !p.esgotado)
  );

  return {
    ok: true,
    catalogo: {
      tv: { nome: tv.nome, layout: tv.layout, config },
      loja: {
        nome: perfil.nomeLoja,
        logo: perfil.perfilLoja || null,
        cor: perfil.temaCorMenu,
        aberta: perfil.lojaAberta,
        verificada: perfil.lojaVerificada,
        link: perfil.lojaCanonicalUrl,
      },
      produtos: filtrados,
    },
  };
}
