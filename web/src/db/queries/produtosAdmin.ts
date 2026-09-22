import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { produtos, categorias, estoque, produtoVariacoes, produtoExtras, produtoComplementosItens, configuracoes } from "@/db/schema";
import { storageSaveBase64, storageDelete } from "@/db/queries/storage";

/*
 * Equivalente de admin/api/v1/produtos.php (GET/POST/PATCH/DELETE): CRUD do
 * catalogo administrativo (produto, variacoes, extras, complementos).
 * Fora do escopo (igual ao PHP original): combos, vinculo de estoque entre
 * produtos (esse ultimo ja portado em estoqueVinculo.ts para o fluxo de
 * pedido/PDV, mas a TELA de vinculo em si nao).
 */

async function bumpCatalogoVersao(lojaId: number): Promise<void> {
  const valor = String(Date.now() / 1000);
  await db
    .insert(configuracoes)
    .values({ loja_id: lojaId, chave: "catalogo_versao", valor })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
}

export type ProdutoAdmin = {
  id: number;
  nome: string | null;
  precoBase: number | null;
  preco: number;
  ativo: boolean | null;
  categoriaId: number | null;
  categoria: string | null;
  estoqueQuantidade: number;
  precoPromocional: number | null;
  promoDesativado: boolean;
  imagem: string | null;
  descricao: string | null;
  apenasAgendamento: boolean;
  quantidadeMinima: number;
  pontosGanho: number;
  pontosCusto: number;
  disponivelCatalogo: boolean;
  disponivelMesa: boolean;
  diasSemana: unknown[];
  horarioIni: string | null;
  horarioFim: string | null;
  dataFabricacao: string | null;
  dataValidade: string | null;
  temVariacoes: boolean;
  destaque: boolean;
};

export async function listarProdutosAdmin(lojaId: number): Promise<ProdutoAdmin[]> {
  const precoExpr = sql<number>`case when ${produtos.promo_desativado} = false and ${produtos.preco_promocional} is not null and ${produtos.preco_promocional} > 0 then ${produtos.preco_promocional} else ${produtos.preco} end`;

  const linhas = await db
    .select({
      id: produtos.id,
      nome: produtos.nome,
      precoBase: produtos.preco,
      preco: precoExpr,
      ativo: produtos.ativo,
      categoriaId: produtos.categoria_id,
      categoria: categorias.nome,
      estoqueQuantidade: sql<number>`coalesce(${estoque.quantidade}, 0)`,
      precoPromocional: produtos.preco_promocional,
      promoDesativado: produtos.promo_desativado,
      imagem: produtos.imagem,
      descricao: produtos.descricao,
      apenasAgendamento: produtos.apenas_agendamento,
      quantidadeMinima: produtos.quantidade_minima,
      pontosGanho: produtos.pontos_ganho,
      pontosCusto: produtos.pontos_custo,
      disponivelCatalogo: produtos.disponivel_catalogo,
      disponivelMesa: produtos.disponivel_mesa,
      diasSemana: produtos.dias_semana,
      horarioIni: produtos.horario_ini,
      horarioFim: produtos.horario_fim,
      dataFabricacao: produtos.data_fabricacao,
      dataValidade: produtos.data_validade,
      temVariacoes: produtos.tem_variacoes,
      destaque: produtos.destaque,
    })
    .from(produtos)
    .leftJoin(categorias, and(eq(categorias.id, produtos.categoria_id), eq(categorias.loja_id, produtos.loja_id)))
    .leftJoin(estoque, and(eq(estoque.produto_id, produtos.id), eq(estoque.loja_id, produtos.loja_id)))
    .where(eq(produtos.loja_id, lojaId))
    .orderBy(sql`${categorias.ordem} is null`, categorias.ordem, categorias.nome, sql`${produtos.ordem} is null`, produtos.ordem, produtos.nome);

  return linhas.map((l) => {
    let diasSemana: unknown[] = [];
    if (l.diasSemana) {
      try {
        const decoded = JSON.parse(l.diasSemana);
        diasSemana = Array.isArray(decoded) ? decoded : [];
      } catch {
        diasSemana = [];
      }
    }
    return { ...l, preco: Number(l.preco), diasSemana };
  });
}

export async function alterarAtivoDestaque(lojaId: number, id: number, ativo?: boolean, destaque?: boolean): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "Dados invalidos." };
  const set: Partial<typeof produtos.$inferInsert> = {};
  if (ativo !== undefined) set.ativo = ativo;
  if (destaque !== undefined) set.destaque = destaque;
  if (Object.keys(set).length === 0) return { ok: false, msg: "Dados invalidos." };

  await db.update(produtos).set(set).where(and(eq(produtos.id, id), eq(produtos.loja_id, lojaId)));
  await bumpCatalogoVersao(lojaId);
  return { ok: true };
}

export async function excluirProduto(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "ID invalido." };
  const linhas = await db.select({ imagem: produtos.imagem }).from(produtos).where(and(eq(produtos.id, id), eq(produtos.loja_id, lojaId))).limit(1);
  await db.delete(produtos).where(and(eq(produtos.id, id), eq(produtos.loja_id, lojaId)));
  await storageDelete(linhas[0]?.imagem ?? null);
  await bumpCatalogoVersao(lojaId);
  return { ok: true };
}

export type VariacaoInput = { tamanho?: string; cor?: string; preco?: number };
export type ExtraInput = { nome?: string; preco?: number; obrigatorio?: boolean };
export type ComplementoItemInput = { nome?: string; preco?: number; obrigatorio?: boolean };

async function salvarVariacoes(produtoId: number, lojaId: number, variacoes: VariacaoInput[]): Promise<void> {
  await db.delete(produtoVariacoes).where(and(eq(produtoVariacoes.produto_id, produtoId), eq(produtoVariacoes.loja_id, lojaId)));
  let ordem = 1;
  for (const v of variacoes) {
    const tamanho = (v.tamanho ?? "").trim();
    const cor = (v.cor ?? "").trim();
    const preco = Number(v.preco ?? 0);
    if (tamanho === "" && cor === "" && preco <= 0) continue;
    await db.insert(produtoVariacoes).values({ produto_id: produtoId, tamanho, cor, preco, ordem, loja_id: lojaId });
    ordem++;
  }
}

async function salvarExtras(produtoId: number, lojaId: number, extras: ExtraInput[]): Promise<void> {
  await db.delete(produtoExtras).where(and(eq(produtoExtras.produto_id, produtoId), eq(produtoExtras.loja_id, lojaId)));
  let ordem = 1;
  for (const e of extras) {
    const nome = (e.nome ?? "").trim();
    const preco = Number(e.preco ?? 0);
    if (nome === "" && preco <= 0) continue;
    await db.insert(produtoExtras).values({ produto_id: produtoId, nome, preco, obrigatorio: Boolean(e.obrigatorio), ordem, loja_id: lojaId });
    ordem++;
  }
}

async function salvarComplementosItens(produtoId: number, lojaId: number, itens: ComplementoItemInput[]): Promise<void> {
  await db.delete(produtoComplementosItens).where(and(eq(produtoComplementosItens.produto_id, produtoId), eq(produtoComplementosItens.loja_id, lojaId)));
  let ordem = 1;
  for (const it of itens) {
    const nome = (it.nome ?? "").trim();
    const preco = Number(it.preco ?? 0);
    if (nome === "" && preco <= 0) continue;
    await db.insert(produtoComplementosItens).values({ produto_id: produtoId, nome, preco, obrigatorio: Boolean(it.obrigatorio), ordem, loja_id: lojaId });
    ordem++;
  }
}

export type SalvarProdutoInput = {
  id?: number;
  nome: string;
  preco: number;
  categoriaId?: number | null;
  descricao?: string;
  precoPromocional?: number | null;
  promoDesativado?: boolean;
  ativo?: boolean;
  imagemBase64?: string;
  imagemRemover?: boolean;
  apenasAgendamento?: boolean;
  quantidadeMinima?: number;
  pontosGanho?: number;
  pontosCusto?: number;
  disponivelCatalogo?: boolean;
  disponivelMesa?: boolean;
  diasSemana?: unknown[];
  horarioIni?: string;
  horarioFim?: string;
  dataFabricacao?: string;
  dataValidade?: string;
  temVariacoes?: boolean;
  variacoes?: VariacaoInput[];
  extras?: ExtraInput[];
  complementosItens?: ComplementoItemInput[];
};

export type SalvarProdutoResultado = { ok: true; action: "insert" | "update"; id: number; imagem: string | null } | { ok: false; msg: string };

export async function salvarProduto(lojaId: number, input: SalvarProdutoInput): Promise<SalvarProdutoResultado> {
  const nome = input.nome.trim();
  const preco = Number(input.preco ?? 0);
  if (!nome) return { ok: false, msg: "Informe o nome do produto." };
  if (preco <= 0) return { ok: false, msg: "Informe um preco valido." };

  const categoriaId = input.categoriaId && input.categoriaId > 0 ? input.categoriaId : null;
  const descricao = (input.descricao ?? "").trim() || null;
  const precoPromocional = input.precoPromocional !== undefined && input.precoPromocional !== null ? Number(input.precoPromocional) : null;
  const diasSemanaJson = input.diasSemana && input.diasSemana.length > 0 ? JSON.stringify(input.diasSemana) : null;
  const temVariacoes = Boolean(input.temVariacoes);
  const variacoesArr = input.variacoes ?? [];
  const extrasArr = input.extras ?? [];
  const complementosArr = input.complementosItens ?? [];

  const campos = {
    nome,
    preco,
    categoria_id: categoriaId,
    ativo: Boolean(input.ativo),
    descricao,
    preco_promocional: precoPromocional,
    promo_desativado: Boolean(input.promoDesativado),
    /* promo_dias/promo_inicio: feature legada de "promocao por N dias" sem
       equivalente neste form — zera pra uma promocao antiga com prazo
       vencido nao travar o produto pra sempre (catalogo.ts checa expiracao). */
    promo_dias: null,
    promo_inicio: null,
    apenas_agendamento: Boolean(input.apenasAgendamento),
    quantidade_minima: Math.max(0, Number(input.quantidadeMinima ?? 0)),
    pontos_ganho: Math.max(0, Number(input.pontosGanho ?? 0)),
    pontos_custo: Math.max(0, Number(input.pontosCusto ?? 0)),
    disponivel_catalogo: Boolean(input.disponivelCatalogo),
    disponivel_mesa: Boolean(input.disponivelMesa),
    dias_semana: diasSemanaJson,
    horario_ini: input.horarioIni?.trim() || null,
    horario_fim: input.horarioFim?.trim() || null,
    data_fabricacao: input.dataFabricacao?.trim() || null,
    data_validade: input.dataValidade?.trim() || null,
    tem_variacoes: temVariacoes,
  };

  if (input.id && input.id > 0) {
    const idInt = input.id;
    const atual = await db.select({ imagem: produtos.imagem }).from(produtos).where(and(eq(produtos.id, idInt), eq(produtos.loja_id, lojaId))).limit(1);
    let imagemAtual = atual[0]?.imagem ?? null;

    const set: Record<string, unknown> = { ...campos };
    if (input.imagemRemover) {
      await storageDelete(imagemAtual);
      set.imagem = null;
      imagemAtual = null;
    } else if (input.imagemBase64) {
      const novaImagem = await storageSaveBase64(input.imagemBase64, "produtos", "produto", lojaId);
      if (!novaImagem) return { ok: false, msg: "Imagem invalida." };
      await storageDelete(imagemAtual);
      set.imagem = novaImagem;
      imagemAtual = novaImagem;
    }

    await db.update(produtos).set(set).where(and(eq(produtos.id, idInt), eq(produtos.loja_id, lojaId)));

    await salvarVariacoes(idInt, lojaId, temVariacoes ? variacoesArr : []);
    await salvarExtras(idInt, lojaId, extrasArr);
    await salvarComplementosItens(idInt, lojaId, complementosArr);

    await bumpCatalogoVersao(lojaId);
    return { ok: true, action: "update", id: idInt, imagem: imagemAtual };
  }

  const [{ novaOrdem }] = categoriaId === null
    ? await db.select({ novaOrdem: sql<number>`coalesce(max(${produtos.ordem}), 0) + 1` }).from(produtos).where(and(sql`${produtos.categoria_id} is null`, eq(produtos.loja_id, lojaId)))
    : await db.select({ novaOrdem: sql<number>`coalesce(max(${produtos.ordem}), 0) + 1` }).from(produtos).where(and(eq(produtos.categoria_id, categoriaId), eq(produtos.loja_id, lojaId)));

  let imagemSalva: string | null = null;
  if (input.imagemBase64) {
    imagemSalva = await storageSaveBase64(input.imagemBase64, "produtos", "produto", lojaId);
    if (!imagemSalva) return { ok: false, msg: "Imagem invalida." };
  }

  const [inserido] = await db
    .insert(produtos)
    .values({ ...campos, loja_id: lojaId, ordem: novaOrdem, imagem: imagemSalva })
    .returning({ id: produtos.id });

  await salvarVariacoes(inserido.id, lojaId, temVariacoes ? variacoesArr : []);
  await salvarExtras(inserido.id, lojaId, extrasArr);
  await salvarComplementosItens(inserido.id, lojaId, complementosArr);

  await bumpCatalogoVersao(lojaId);
  return { ok: true, action: "insert", id: inserido.id, imagem: imagemSalva };
}
