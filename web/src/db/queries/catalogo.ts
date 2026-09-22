import "server-only";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { categorias, produtos, produtoVariacoes, combos, estoque } from "@/db/schema";
import { aplicarReservaPdv, reservaMapaPdv } from "@/db/queries/pdvReservas";

/*
 * Equivalente de helpers/loja_catalogo.php (montarCatalogoLoja): monta
 * categorias/produtos/combos/destaques da loja publica. Mesma regra de
 * disponibilidade por dia da semana/horario, promocao e reserva do PDV.
 * Diferenca: o esquema migrado ja tem todas as colunas (sem os testes
 * "SHOW COLUMNS" que o PHP faz para compatibilidade com instalacoes antigas).
 */

type DiaCod = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";
const FUSO_LOJA = "America/Fortaleza";

function agoraNaLoja(): { dia: DiaCod; hora: string } {
  const agora = new Date();
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_LOJA,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(agora);
  const mapaDia: Record<string, DiaCod> = {
    Sun: "dom",
    Mon: "seg",
    Tue: "ter",
    Wed: "qua",
    Thu: "qui",
    Fri: "sex",
    Sat: "sab",
  };
  const weekday = partes.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = partes.find((p) => p.type === "hour")?.value ?? "00";
  const minute = partes.find((p) => p.type === "minute")?.value ?? "00";
  return { dia: mapaDia[weekday] ?? "dom", hora: `${hour}:${minute}` };
}

function disponivelAgora(
  diasSemanaJson: string | null,
  horarioIni: string | null,
  horarioFim: string | null,
  agora: { dia: string; hora: string }
): boolean {
  if (diasSemanaJson) {
    try {
      const dias = JSON.parse(diasSemanaJson) as unknown;
      if (Array.isArray(dias) && dias.length > 0 && !dias.includes(agora.dia)) return false;
    } catch {
      /* JSON invalido: ignora a restricao de dias */
    }
  }
  if (horarioIni && agora.hora < horarioIni) return false;
  if (horarioFim && agora.hora > horarioFim) return false;
  return true;
}

/** Resolve caminho de imagem salvo no banco para uma URL absoluta (imagens ja migradas sao URLs R2 absolutas). */
function resolverImagem(caminho: string | null, phpAdminUrl: string): string | null {
  if (!caminho) return null;
  if (/^https?:\/\//i.test(caminho) || caminho.startsWith("/")) return caminho;
  return `${phpAdminUrl}/${caminho}`;
}

export type CatalogoProduto = {
  id: number;
  nome: string;
  descricao: string | null;
  imagem: string | null;
  precoBase: number;
  precoFinal: number;
  emPromo: boolean;
  descPct: number;
  promoImagem: string | null;
  promoDescricao: string | null;
  promoEtiqueta: string | null;
  quantidadeMinima: number;
  pontosGanho: number;
  temVariacoes: boolean;
  destaque: boolean;
  estoque: number;
  esgotado: boolean;
};

export type CatalogoCombo = {
  id: number;
  tipo: "combo";
  nome: string;
  descricao: string | null;
  imagem: string | null;
  precoBase: number;
  precoFinal: number;
  emPromo: boolean;
  descPct: number;
};

export type CatalogoCategoria = { id: number; nome: string; modoExibicao: string };

export type CatalogoLoja = {
  categorias: CatalogoCategoria[];
  produtosPorCategoria: Record<number, CatalogoProduto[]>;
  combosPorCategoria: Record<number, CatalogoCombo[]>;
  destaques: (CatalogoProduto | CatalogoCombo)[];
  produtosEmPromo: CatalogoProduto[];
  promoAutoPopup: CatalogoProduto | null;
};

function promoAtiva(
  precoBase: number,
  precoPromocional: number | null,
  promoDesativado: boolean,
  promoDias: number | null,
  promoInicio: string | null
): { emPromo: boolean; precoFinal: number; descPct: number } {
  let expirada = false;
  if (promoDias != null && promoInicio) {
    const fim = new Date(promoInicio);
    fim.setDate(fim.getDate() + promoDias);
    expirada = fim.getTime() <= new Date(new Date().toDateString()).getTime();
  }
  if (!promoDesativado && precoPromocional != null && precoPromocional > 0 && !expirada) {
    const precoFinal = precoPromocional;
    return { emPromo: true, precoFinal, descPct: Math.round((1 - precoFinal / precoBase) * 100) };
  }
  return { emPromo: false, precoFinal: precoBase, descPct: 0 };
}

export async function montarCatalogoLoja(lojaId: number, phpAdminUrl = ""): Promise<CatalogoLoja> {
  const agora = agoraNaLoja();

  const categoriasLinhas = await db
    .select({
      id: categorias.id,
      nome: categorias.nome,
      modoExibicao: categorias.modo_exibicao,
      diasSemana: categorias.dias_semana,
      horarioIni: categorias.horario_ini,
      horarioFim: categorias.horario_fim,
    })
    .from(categorias)
    .where(and(eq(categorias.loja_id, lojaId), eq(categorias.ativo, true)))
    .orderBy(sql`${categorias.ordem} is null, ${categorias.ordem}, ${categorias.nome}`);

  const categoriasDisponiveis = categoriasLinhas.filter((c) => disponivelAgora(c.diasSemana, c.horarioIni, c.horarioFim, agora));
  if (categoriasDisponiveis.length === 0) {
    return { categorias: [], produtosPorCategoria: {}, combosPorCategoria: {}, destaques: [], produtosEmPromo: [], promoAutoPopup: null };
  }
  const idsCategorias = categoriasDisponiveis.map((c) => c.id);

  const variacoesMin = await db
    .select({ produtoId: produtoVariacoes.produto_id, precoMin: sql<number>`min(${produtoVariacoes.preco})` })
    .from(produtoVariacoes)
    .where(and(eq(produtoVariacoes.loja_id, lojaId), eq(produtoVariacoes.ativo, true)))
    .groupBy(produtoVariacoes.produto_id);
  const precoMinPorProduto = new Map(variacoesMin.map((v) => [v.produtoId, Number(v.precoMin)]));

  const reservas = await reservaMapaPdv(lojaId);

  const produtosLinhas = await db
    .select({
      id: produtos.id,
      categoriaId: produtos.categoria_id,
      nome: produtos.nome,
      descricao: produtos.descricao,
      preco: produtos.preco,
      imagem: produtos.imagem,
      precoPromocional: produtos.preco_promocional,
      promoDesativado: produtos.promo_desativado,
      promoDias: produtos.promo_dias,
      promoInicio: produtos.promo_inicio,
      promoImagem: produtos.promo_imagem,
      promoDescricao: produtos.promo_descricao,
      promoEtiqueta: produtos.promo_etiqueta,
      quantidadeMinima: produtos.quantidade_minima,
      pontosGanho: produtos.pontos_ganho,
      diasSemana: produtos.dias_semana,
      horarioIni: produtos.horario_ini,
      horarioFim: produtos.horario_fim,
      temVariacoes: produtos.tem_variacoes,
      destaque: produtos.destaque,
      ordem: produtos.ordem,
      estoqueQtd: estoque.quantidade,
    })
    .from(produtos)
    .leftJoin(estoque, and(eq(estoque.produto_id, produtos.id), eq(estoque.loja_id, produtos.loja_id)))
    .where(and(eq(produtos.loja_id, lojaId), eq(produtos.ativo, true), inArray(produtos.categoria_id, idsCategorias)))
    .orderBy(sql`${produtos.ordem} is null, ${produtos.ordem}, ${produtos.nome}`);

  const produtosPorCategoria: Record<number, CatalogoProduto[]> = {};
  for (const p of produtosLinhas) {
    if (p.categoriaId == null) continue;
    if (!disponivelAgora(p.diasSemana, p.horarioIni, p.horarioFim, agora)) continue;

    const precoBaseBruto = Number(p.preco ?? 0);
    const precoBase = p.temVariacoes && precoMinPorProduto.has(p.id) ? precoMinPorProduto.get(p.id)! || precoBaseBruto : precoBaseBruto;
    const { emPromo, precoFinal, descPct } = promoAtiva(precoBase, p.precoPromocional, p.promoDesativado, p.promoDias, p.promoInicio);
    const estoqueBruto = p.estoqueQtd ?? 0;
    const estoqueDisponivel = aplicarReservaPdv(estoqueBruto, p.id, reservas);

    const item: CatalogoProduto = {
      id: p.id,
      nome: p.nome ?? "",
      descricao: p.descricao,
      imagem: resolverImagem(p.imagem, phpAdminUrl),
      precoBase,
      precoFinal,
      emPromo,
      descPct,
      promoImagem: resolverImagem(p.promoImagem, phpAdminUrl),
      promoDescricao: p.promoDescricao,
      promoEtiqueta: p.promoEtiqueta,
      quantidadeMinima: p.quantidadeMinima,
      pontosGanho: p.pontosGanho,
      temVariacoes: p.temVariacoes,
      destaque: p.destaque,
      estoque: estoqueDisponivel,
      esgotado: estoqueDisponivel <= 0,
    };
    (produtosPorCategoria[p.categoriaId] ??= []).push(item);
  }

  const combosLinhas = await db
    .select({
      id: combos.id,
      categoriaId: combos.categoria_id,
      nome: combos.nome,
      descricao: combos.descricao,
      preco: combos.preco,
      imagem: combos.imagem,
      precoPromocional: combos.preco_promocional,
      promoDesativado: combos.promo_desativado,
    })
    .from(combos)
    .where(and(eq(combos.loja_id, lojaId), eq(combos.ativo, true), isNotNull(combos.categoria_id), inArray(combos.categoria_id, idsCategorias)))
    .orderBy(sql`${combos.ordem} is null, ${combos.ordem}, ${combos.nome}`);

  const combosPorCategoria: Record<number, CatalogoCombo[]> = {};
  for (const c of combosLinhas) {
    if (c.categoriaId == null) continue;
    const precoBase = Number(c.preco ?? 0);
    const { emPromo, precoFinal, descPct } = promoAtiva(precoBase, c.precoPromocional, c.promoDesativado, null, null);
    const item: CatalogoCombo = {
      id: c.id,
      tipo: "combo",
      nome: c.nome,
      descricao: c.descricao,
      imagem: resolverImagem(c.imagem, phpAdminUrl),
      precoBase,
      precoFinal,
      emPromo,
      descPct,
    };
    (combosPorCategoria[c.categoriaId] ??= []).push(item);
  }

  const categoriasComItens = categoriasDisponiveis
    .filter((c) => produtosPorCategoria[c.id]?.length || combosPorCategoria[c.id]?.length)
    .map((c) => ({ id: c.id, nome: c.nome ?? "", modoExibicao: c.modoExibicao }));

  const destaques: (CatalogoProduto | CatalogoCombo)[] = [];
  for (const lista of Object.values(produtosPorCategoria)) {
    for (const p of lista) if (p.emPromo || p.destaque) destaques.push(p);
  }
  for (const lista of Object.values(combosPorCategoria)) destaques.push(...lista);

  const produtosEmPromo: CatalogoProduto[] = [];
  for (const lista of Object.values(produtosPorCategoria)) {
    for (const p of lista) if (p.emPromo) produtosEmPromo.push(p);
  }

  let promoAutoPopup: CatalogoProduto | null = null;
  for (const lista of Object.values(produtosPorCategoria)) {
    const achado = lista.find((p) => p.emPromo && (p.promoImagem || p.promoDescricao));
    if (achado) {
      promoAutoPopup = achado;
      break;
    }
  }

  return { categorias: categoriasComItens, produtosPorCategoria, combosPorCategoria, destaques, produtosEmPromo, promoAutoPopup };
}
