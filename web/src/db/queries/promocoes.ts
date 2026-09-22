import "server-only";
import { and, eq, ne, sql, asc, notInArray, desc } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import type { NeonTx } from "@/db";
import { produtos, categorias, operacaoLogs, configuracoes } from "@/db/schema";
import { getConfig } from "@/db/queries/config";
import { storageSaveBase64, storageDelete } from "@/db/queries/storage";
import { bumpCatalogoVersao } from "@/db/queries/estoqueVinculo";
import { dataFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/promo_listar.php, promo_salvar.php,
 * flyers_salvar.php e flyers_toggle.php: tela de Promocoes (/promotion) —
 * preco promocional por produto (com limite de simultaneas) e flyers/banners
 * rotativos da loja publica.
 */

const LIMITE_PROMOS_ATIVAS = 6;

async function registrarOperacao(operadorId: number | null, acao: string, referencia: string, dados?: Record<string, unknown>): Promise<void> {
  try {
    await db.insert(operacaoLogs).values({ operador_id: operadorId, acao, referencia, dados: dados ? JSON.stringify(dados) : null });
  } catch {
    // silencia — log nao pode interromper o fluxo principal
  }
}

/** dataISO (YYYY-MM-DD) + dias, aritmetica pura em UTC-label. */
function somarDias(dataISO: string, dias: number): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + dias * 86_400_000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** Diferenca em dias (fim - inicio), ambas datas ISO. */
function diffDias(inicioISO: string, fimISO: string): number {
  const [y1, m1, d1] = inicioISO.split("-").map(Number);
  const [y2, m2, d2] = fimISO.split("-").map(Number);
  const ms = Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1);
  return Math.round(ms / 86_400_000);
}

export type ProdutoPromo = {
  id: number;
  nome: string | null;
  preco: number | null;
  categoriaId: number | null;
  categoria: string | null;
  precoPromocional: number | null;
  promoDesativado: boolean;
  promoDias: number | null;
  promoInicio: string | null;
  promoImagem: string | null;
  promoDescricao: string | null;
  promoEtiqueta: string | null;
  imagem: string | null;
  emPromo: boolean;
  diasRestantes: number | null;
};

export type ListarPromocoesResultado = {
  produtos: ProdutoPromo[];
  limiteAtivas: number;
  ativasCount: number;
  flyers: string[];
  flyersAtivo: boolean;
};

export async function listarPromocoes(lojaId: number): Promise<ListarPromocoesResultado> {
  const hoje = dataFortaleza();

  const lojaFlyersRaw = await getConfig(lojaId, "loja_flyers", "[]");
  let lojaFlyers: string[] = [];
  try {
    const decoded = JSON.parse(lojaFlyersRaw);
    if (Array.isArray(decoded)) lojaFlyers = decoded.filter((v): v is string => typeof v === "string" && v !== "");
  } catch {
    lojaFlyers = [];
  }
  const flyersAtivo = (await getConfig(lojaId, "loja_flyers_ativo", "1")) === "1";

  // desativa lazy as promocoes cuja data de expiracao (inicio + dias) ja passou
  await db
    .update(produtos)
    .set({ promo_desativado: true })
    .where(
      and(
        eq(produtos.loja_id, lojaId),
        eq(produtos.promo_desativado, false),
        sql`${produtos.promo_dias} is not null and ${produtos.promo_inicio} is not null and ${produtos.promo_inicio} + ${produtos.promo_dias} <= ${hoje}::date`
      )
    );

  // auto-correcao lazy: mantem so as LIMITE_PROMOS_ATIVAS mais recentes, desativa o resto
  const manter = await db
    .select({ id: produtos.id })
    .from(produtos)
    .where(and(eq(produtos.loja_id, lojaId), eq(produtos.promo_desativado, false), sql`${produtos.preco_promocional} > 0`))
    .orderBy(desc(produtos.promo_inicio), desc(produtos.id))
    .limit(LIMITE_PROMOS_ATIVAS);
  const manterIds = manter.map((m) => m.id);
  if (manterIds.length > 0) {
    await db.update(produtos).set({ promo_desativado: true }).where(and(eq(produtos.loja_id, lojaId), eq(produtos.promo_desativado, false), notInArray(produtos.id, manterIds)));
  }

  const linhas = await db
    .select({
      id: produtos.id,
      nome: produtos.nome,
      preco: produtos.preco,
      categoriaId: produtos.categoria_id,
      categoria: categorias.nome,
      precoPromocional: produtos.preco_promocional,
      promoDesativado: produtos.promo_desativado,
      promoDias: produtos.promo_dias,
      promoInicio: produtos.promo_inicio,
      promoImagem: produtos.promo_imagem,
      promoDescricao: produtos.promo_descricao,
      promoEtiqueta: produtos.promo_etiqueta,
      imagem: produtos.imagem,
      categoriaOrdem: categorias.ordem,
    })
    .from(produtos)
    .leftJoin(categorias, and(eq(categorias.id, produtos.categoria_id), eq(categorias.loja_id, produtos.loja_id)))
    .where(and(eq(produtos.loja_id, lojaId), eq(produtos.ativo, true)))
    .orderBy(sql`${categorias.ordem} is null`, asc(categorias.ordem), asc(categorias.nome), asc(produtos.nome));

  let ativasCount = 0;
  const resultado: ProdutoPromo[] = linhas.map((l) => {
    const emPromo = !l.promoDesativado && (l.precoPromocional ?? 0) > 0;
    let diasRestantes: number | null = null;
    if (emPromo && l.promoDias && l.promoInicio) {
      const fim = somarDias(l.promoInicio, l.promoDias);
      diasRestantes = Math.max(0, diffDias(hoje, fim));
    }
    if (emPromo) ativasCount++;
    return {
      id: l.id,
      nome: l.nome,
      preco: l.preco,
      categoriaId: l.categoriaId,
      categoria: l.categoria,
      precoPromocional: l.precoPromocional,
      promoDesativado: l.promoDesativado,
      promoDias: l.promoDias,
      promoInicio: l.promoInicio,
      promoImagem: l.promoImagem,
      promoDescricao: l.promoDescricao,
      promoEtiqueta: l.promoEtiqueta,
      imagem: l.imagem,
      emPromo,
      diasRestantes,
    };
  });

  return { produtos: resultado, limiteAtivas: LIMITE_PROMOS_ATIVAS, ativasCount, flyers: lojaFlyers, flyersAtivo };
}

export type SalvarPromocaoInput = {
  produtoId: number;
  ativar: boolean;
  precoPromocional?: string | number;
  promoDias?: string | number;
  promoDescricao?: string;
  promoImagemBase64?: string;
  promoImagemRemover?: boolean;
  promoEtiqueta?: string;
};

const ETIQUETAS_VALIDAS = ["recomendado", "mais_pedido", "novidade", "edicao_limitada"];

export async function salvarPromocao(lojaId: number, operadorId: number, input: SalvarPromocaoInput): Promise<{ ok: true } | { ok: false; msg: string }> {
  const produtoId = input.produtoId;
  const ativar = input.ativar;
  const precoPromoRaw = String(input.precoPromocional ?? "").trim();
  const promoDiasRaw = String(input.promoDias ?? "").trim();
  const promoDescricaoRaw = (input.promoDescricao ?? "").trim();
  const promoImagemBase64 = (input.promoImagemBase64 ?? "").trim();
  const promoImagemRemover = Boolean(input.promoImagemRemover);
  const promoEtiquetaRaw = (input.promoEtiqueta ?? "").trim();
  const promoEtiqueta = ETIQUETAS_VALIDAS.includes(promoEtiquetaRaw) ? promoEtiquetaRaw : null;

  if (produtoId <= 0) return { ok: false, msg: "Produto invalido." };

  const precoPromocional = precoPromoRaw !== "" ? Number(precoPromoRaw.replace(",", ".")) : null;
  const promoDias = promoDiasRaw !== "" ? Math.max(1, parseInt(promoDiasRaw, 10)) : null;
  const promoDescricao = promoDescricaoRaw !== "" ? promoDescricaoRaw : null;

  if (ativar && (!precoPromocional || precoPromocional <= 0)) return { ok: false, msg: "Informe um preco promocional valido." };

  try {
    const resultado = await withTransaction(async (tx): Promise<{ ok: true } | { ok: false; msg: string }> => {
      const [atual] = await tx.select({ promoDesativado: produtos.promo_desativado, promoImagem: produtos.promo_imagem }).from(produtos).where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId))).limit(1);
      if (!atual) return { ok: false, msg: "Produto nao encontrado." };
      const estavaAtiva = !atual.promoDesativado;

      if (ativar && !estavaAtiva) {
        const [{ n }] = await tx
          .select({ n: sql<string>`count(*)` })
          .from(produtos)
          .where(and(eq(produtos.loja_id, lojaId), ne(produtos.id, produtoId), eq(produtos.promo_desativado, false)));
        if (Number(n) >= LIMITE_PROMOS_ATIVAS) {
          return { ok: false, msg: `Você já tem ${LIMITE_PROMOS_ATIVAS} produtos em promoção. Desative um para ativar este.` };
        }
      }

      let novaImagem: string | null = null;
      if (promoImagemRemover) {
        await storageDelete(atual.promoImagem);
      } else if (promoImagemBase64 !== "") {
        novaImagem = await storageSaveBase64(promoImagemBase64, "promo", "promo", lojaId);
        if (novaImagem === null) return { ok: false, msg: "Imagem invalida (use JPG, PNG ou WebP)." };
        if (atual.promoImagem) await storageDelete(atual.promoImagem);
      }

      const set: Partial<typeof produtos.$inferInsert> = {
        preco_promocional: precoPromocional,
        promo_desativado: !ativar,
        promo_dias: promoDias,
        promo_descricao: promoDescricao,
        promo_etiqueta: promoEtiqueta,
      };
      if (ativar && !estavaAtiva) set.promo_inicio = dataFortaleza();
      if (promoImagemRemover) set.promo_imagem = null;
      else if (novaImagem !== null) set.promo_imagem = novaImagem;

      await tx.update(produtos).set(set).where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId)));

      return { ok: true };
    });

    if (resultado.ok) {
      await registrarOperacao(operadorId, ativar ? "promo_ativada" : "promo_desativada", `produto:${produtoId}`, { preco_promocional: precoPromocional, promo_dias: promoDias });
    }
    return resultado;
  } catch {
    return { ok: false, msg: "Erro ao salvar promocao." };
  }
}

export type SalvarFlyersInput = {
  flyer1?: { remover?: boolean; base64?: string; url?: string };
  flyer2?: { remover?: boolean; base64?: string; url?: string };
  flyer3?: { remover?: boolean; base64?: string; url?: string };
};

export async function salvarFlyers(lojaId: number, input: SalvarFlyersInput): Promise<{ ok: true; flyers: string[] } | { ok: false; msg: string }> {
  const atuaisRaw = await getConfig(lojaId, "loja_flyers", "[]");
  let atuais: string[] = [];
  try {
    const decoded = JSON.parse(atuaisRaw);
    if (Array.isArray(decoded)) atuais = decoded.filter((v): v is string => typeof v === "string");
  } catch {
    atuais = [];
  }

  const posicoes = [input.flyer1, input.flyer2, input.flyer3];
  const novos: string[] = [];

  for (let n = 0; n < posicoes.length; n++) {
    const pos = posicoes[n] ?? {};
    const remover = Boolean(pos.remover);
    const base64 = (pos.base64 ?? "").trim();
    const urlExistente = (pos.url ?? "").trim();

    if (remover) continue;
    if (base64 !== "") {
      const salvo = await storageSaveBase64(base64, "flyers", "flyer", lojaId);
      if (salvo === null) return { ok: false, msg: `Imagem do flyer ${n + 1} invalida (use JPG, PNG ou WebP).` };
      novos.push(salvo);
    } else if (urlExistente !== "" && atuais.includes(urlExistente)) {
      novos.push(urlExistente);
    }
  }

  for (const antiga of atuais) {
    if (antiga && !novos.includes(antiga)) await storageDelete(antiga);
  }

  await db
    .insert(configuracoes)
    .values({ loja_id: lojaId, chave: "loja_flyers", valor: JSON.stringify(novos) })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor: JSON.stringify(novos) } });

  await withTransaction(async (tx: NeonTx) => {
    await bumpCatalogoVersao(tx, lojaId);
  });

  return { ok: true, flyers: novos };
}

export async function toggleFlyersAtivo(lojaId: number, ativo: boolean): Promise<{ ok: true } | { ok: false }> {
  await db
    .insert(configuracoes)
    .values({ loja_id: lojaId, chave: "loja_flyers_ativo", valor: ativo ? "1" : "0" })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor: ativo ? "1" : "0" } });

  await withTransaction(async (tx: NeonTx) => {
    await bumpCatalogoVersao(tx, lojaId);
  });

  return { ok: true };
}
