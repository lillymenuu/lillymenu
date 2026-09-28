import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { landingConfig, planos } from "@/db/schema";

/*
 * Equivalente de landing_get()/landing_table_exists() em public/index.php e
 * public/planos.php: le o conteudo de marketing (textos, imagens, planos de
 * vitrine) da tabela `landing_config` (chave/valor), ja populada com o
 * conteudo real migrado do site antigo — nao ha necessidade de reescrever
 * o conteudo, so de servi-lo numa pagina Next nova.
 */

export type LandingConfigMap = Record<string, string>;

/** Busca todas as chaves de uma vez (a tabela e pequena, ~150 linhas). Chave ausente = string vazia. */
export async function getLandingConfig(): Promise<LandingConfigMap> {
  const linhas = await db.select({ chave: landingConfig.chave, valor: landingConfig.valor }).from(landingConfig);
  const mapa: LandingConfigMap = {};
  for (const l of linhas) mapa[l.chave] = l.valor;
  return mapa;
}

export function lc(config: LandingConfigMap, chave: string, padrao = ""): string {
  return config[chave] || padrao;
}

/** "Label|link" por linha -> lista de itens (nav_links_items, footer_menu_items, footer_para_voce_items). */
export function parseLinkList(raw: string | undefined): { label: string; href: string }[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const [label, href] = linha.split("|");
      return { label: (label ?? "").trim(), href: (href ?? "#").trim() };
    });
}

/** Uma string por linha -> lista (segmentos_items, planos_tabela_destaques, plano{N}_features). */
export function parseLines(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
}

export type PlanoMarketing = {
  slug: string;
  ativo: boolean;
  nome: string;
  preco: string;
  descricao: string;
  features: string[];
  cor: string;
  badge: string;
  botaoTexto: string;
  botaoLink: string;
};

/** Monta os 4 cards de vitrine (plano1..plano4) so com o que ja veio em getLandingConfig — sem ida extra ao banco. */
export function getPlanosMarketing(config: LandingConfigMap): PlanoMarketing[] {
  const slugs = ["plano1", "plano2", "plano3", "plano4"];
  return slugs
    .map((slug) => ({
      slug,
      ativo: config[`${slug}_ativo`] === "1" || config[`${slug}_ativo`] === "true",
      nome: lc(config, `${slug}_nome`),
      preco: lc(config, `${slug}_preco`),
      descricao: lc(config, `${slug}_descricao`),
      features: parseLines(config[`${slug}_features`]),
      cor: lc(config, `${slug}_cor`),
      badge: lc(config, `${slug}_badge`),
      botaoTexto: lc(config, `${slug}_botao_texto`, "Falar com especialista"),
      botaoLink: lc(config, `${slug}_botao_link`, "#contato"),
    }))
    .filter((p) => p.ativo && p.nome !== "");
}

export type PlanoSignup = { id: number; nome: string; valor: number; landingSlug: string; diasTrial: number };

/** Planos reais (de cobranca) elegiveis para o dropdown do formulario de cadastro — igual ao $planosDisponiveis do index.php. */
export async function getPlanosSignup(): Promise<PlanoSignup[]> {
  const linhas = await db
    .select({ id: planos.id, nome: planos.nome, valor: planos.valor, landingSlug: planos.landing_slug, diasTrial: planos.dias_trial })
    .from(planos)
    .where(and(eq(planos.ativo, true), isNotNull(planos.landing_slug)))
    .orderBy(planos.id);
  return linhas.filter((p): p is PlanoSignup => p.landingSlug !== null);
}

/** Plano gratuito de teste (menor valor entre os elegiveis) — usado no cadastro self-service, que nao pede mais o plano no formulario. */
export async function getPlanoTrialGratuito(): Promise<PlanoSignup | null> {
  const linhas = await db
    .select({ id: planos.id, nome: planos.nome, valor: planos.valor, landingSlug: planos.landing_slug, diasTrial: planos.dias_trial })
    .from(planos)
    .where(and(eq(planos.ativo, true), isNotNull(planos.landing_slug)))
    .orderBy(planos.valor)
    .limit(1);
  const [linha] = linhas;
  if (!linha || !linha.landingSlug) return null;
  return { ...linha, landingSlug: linha.landingSlug };
}

/** Resolve um plano real pelo landing_slug escolhido no formulario (plano1/plano2/plano3...). */
export async function getPlanoPorLandingSlug(slug: string): Promise<PlanoSignup | null> {
  const [linha] = await db
    .select({ id: planos.id, nome: planos.nome, valor: planos.valor, landingSlug: planos.landing_slug, diasTrial: planos.dias_trial })
    .from(planos)
    .where(and(eq(planos.landing_slug, slug), eq(planos.ativo, true)))
    .limit(1);
  if (!linha || !linha.landingSlug) return null;
  return { ...linha, landingSlug: linha.landingSlug };
}

