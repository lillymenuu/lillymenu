import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { produtos, categorias, estoque, estoqueGrupoMembros, produtoVariacoes, produtoOpcoesGrupos, produtoOpcoesItens, configuracoes } from "@/db/schema";
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
  codigo: string | null;
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
      codigo: produtos.codigo,
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
  // Sem FK entre estoque_grupo_membros e produtos: sem essa limpeza, o produto excluido fica "preso"
  // como membro do grupo de estoque vinculado e quebra a venda de qualquer outro membro do grupo.
  await db.delete(estoqueGrupoMembros).where(and(eq(estoqueGrupoMembros.produto_id, id), eq(estoqueGrupoMembros.loja_id, lojaId)));
  await db.delete(produtos).where(and(eq(produtos.id, id), eq(produtos.loja_id, lojaId)));
  await storageDelete(linhas[0]?.imagem ?? null);
  await bumpCatalogoVersao(lojaId);
  return { ok: true };
}

export type VariacaoInput = { tamanho?: string; cor?: string; preco?: number };
export type OpcaoItemInput = { nome?: string; preco?: number };
export type GrupoOpcoesInput = { titulo?: string; tipoSelecao?: "unica" | "multipla"; obrigatorio?: boolean; maxSelecao?: number; itens?: OpcaoItemInput[] };

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

/* Grupos de opcoes configuraveis (ex.: "Escolha seu extra", "Coberturas") — substitui os antigos
   produto_extras/produto_complementos_itens por uma lista de N grupos com titulo/selecao/obrigatorio proprios. */
async function salvarGruposOpcoes(produtoId: number, lojaId: number, grupos: GrupoOpcoesInput[]): Promise<void> {
  await db.delete(produtoOpcoesGrupos).where(and(eq(produtoOpcoesGrupos.produto_id, produtoId), eq(produtoOpcoesGrupos.loja_id, lojaId)));
  let ordemGrupo = 1;
  for (const g of grupos) {
    const titulo = (g.titulo ?? "").trim();
    const itensValidos = (g.itens ?? []).filter((it) => (it.nome ?? "").trim() !== "" || Number(it.preco ?? 0) > 0);
    if (titulo === "" || itensValidos.length === 0) continue;

    const [grupoInserido] = await db
      .insert(produtoOpcoesGrupos)
      .values({
        produto_id: produtoId,
        titulo,
        tipo_selecao: g.tipoSelecao === "multipla" ? "multipla" : "unica",
        obrigatorio: Boolean(g.obrigatorio),
        max_selecao: Math.max(0, Number(g.maxSelecao ?? 0)),
        ordem: ordemGrupo,
        loja_id: lojaId,
      })
      .returning({ id: produtoOpcoesGrupos.id });

    let ordemItem = 1;
    for (const it of itensValidos) {
      await db.insert(produtoOpcoesItens).values({
        grupo_id: grupoInserido.id,
        nome: (it.nome ?? "").trim(),
        preco: Number(it.preco ?? 0),
        ordem: ordemItem,
        loja_id: lojaId,
      });
      ordemItem++;
    }
    ordemGrupo++;
  }
}

export type SalvarProdutoInput = {
  id?: number;
  nome: string;
  codigo?: string;
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
  variacoesTitulo?: string;
  variacoesObrigatorio?: boolean;
  variacoes?: VariacaoInput[];
  gruposOpcoes?: GrupoOpcoesInput[];
};

export type SalvarProdutoResultado = { ok: true; action: "insert" | "update"; id: number; imagem: string | null } | { ok: false; msg: string };

export async function salvarProduto(lojaId: number, input: SalvarProdutoInput): Promise<SalvarProdutoResultado> {
  const nome = input.nome.trim();
  const preco = Number(input.preco ?? 0);
  if (!nome) return { ok: false, msg: "Informe o nome do produto." };
  if (preco <= 0) return { ok: false, msg: "Informe um preco valido." };

  const categoriaId = input.categoriaId && input.categoriaId > 0 ? input.categoriaId : null;
  const codigo = (input.codigo ?? "").trim() || null;
  const descricao = (input.descricao ?? "").trim() || null;
  const precoPromocional = input.precoPromocional !== undefined && input.precoPromocional !== null ? Number(input.precoPromocional) : null;
  const diasSemanaJson = input.diasSemana && input.diasSemana.length > 0 ? JSON.stringify(input.diasSemana) : null;
  const temVariacoes = Boolean(input.temVariacoes);
  const variacoesArr = input.variacoes ?? [];
  const gruposOpcoesArr = input.gruposOpcoes ?? [];

  const campos = {
    nome,
    codigo,
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
    variacoes_titulo: input.variacoesTitulo?.trim() || null,
    variacoes_obrigatorio: input.variacoesObrigatorio !== undefined ? Boolean(input.variacoesObrigatorio) : true,
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
    await salvarGruposOpcoes(idInt, lojaId, gruposOpcoesArr);

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
  await salvarGruposOpcoes(inserido.id, lojaId, gruposOpcoesArr);

  await bumpCatalogoVersao(lojaId);
  return { ok: true, action: "insert", id: inserido.id, imagem: imagemSalva };
}

/* Equivalente de admin/api/v1/produto_duplicar.php: clona produto + variacoes + grupos de opcoes
   (com itens) com "(Copia)" no nome. */
export async function duplicarProduto(lojaId: number, produtoId: number): Promise<{ ok: true; id: number } | { ok: false; msg: string }> {
  if (produtoId <= 0) return { ok: false, msg: "ID invalido." };

  const linhas = await db.select().from(produtos).where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId))).limit(1);
  const original = linhas[0];
  if (!original) return { ok: false, msg: "Produto nao encontrado." };

  /* produtos nao tem coluna criado_em/atualizado_em nesta instalacao — so `id` precisa ser omitido. */
  const resto = { ...original };
  delete (resto as { id?: number }).id;
  const [copia] = await db.insert(produtos).values({ ...resto, nome: `${original.nome} (Cópia)` }).returning({ id: produtos.id });

  const variacoesOriginais = await db.select().from(produtoVariacoes).where(and(eq(produtoVariacoes.produto_id, produtoId), eq(produtoVariacoes.loja_id, lojaId)));
  for (const v of variacoesOriginais) {
    const vResto = { ...v };
    delete (vResto as { id?: number }).id;
    await db.insert(produtoVariacoes).values({ ...vResto, produto_id: copia.id });
  }

  const gruposOriginais = await db.select().from(produtoOpcoesGrupos).where(and(eq(produtoOpcoesGrupos.produto_id, produtoId), eq(produtoOpcoesGrupos.loja_id, lojaId)));
  for (const g of gruposOriginais) {
    const itensOriginais = await db.select().from(produtoOpcoesItens).where(and(eq(produtoOpcoesItens.grupo_id, g.id), eq(produtoOpcoesItens.loja_id, lojaId)));
    const gResto = { ...g };
    delete (gResto as { id?: number }).id;
    const [grupoCopia] = await db.insert(produtoOpcoesGrupos).values({ ...gResto, produto_id: copia.id }).returning({ id: produtoOpcoesGrupos.id });
    for (const it of itensOriginais) {
      const itResto = { ...it };
      delete (itResto as { id?: number }).id;
      await db.insert(produtoOpcoesItens).values({ ...itResto, grupo_id: grupoCopia.id });
    }
  }

  await bumpCatalogoVersao(lojaId);
  return { ok: true, id: copia.id };
}

export type VariacaoDetalhe = { id: number; tamanho: string | null; cor: string | null; preco: number };
export type OpcaoItemDetalhe = { id: number; nome: string; preco: number };
export type GrupoOpcoesDetalhe = { id: number; titulo: string; tipoSelecao: "unica" | "multipla"; obrigatorio: boolean; maxSelecao: number; itens: OpcaoItemDetalhe[] };

/* Equivalente de admin/api/v1/produto_variacoes_detalhe.php. */
export async function detalheVariacoesProduto(
  lojaId: number,
  produtoId: number
): Promise<
  | { ok: false; msg: string }
  | { ok: true; variacoes: VariacaoDetalhe[]; variacoesTitulo: string | null; variacoesObrigatorio: boolean; gruposOpcoes: GrupoOpcoesDetalhe[] }
> {
  if (produtoId <= 0) return { ok: false, msg: "Produto invalido." };
  const existe = await db
    .select({ id: produtos.id, variacoesTitulo: produtos.variacoes_titulo, variacoesObrigatorio: produtos.variacoes_obrigatorio })
    .from(produtos)
    .where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId)))
    .limit(1);
  if (existe.length === 0) return { ok: false, msg: "Produto nao encontrado." };

  const variacoes = await db
    .select({ id: produtoVariacoes.id, tamanho: produtoVariacoes.tamanho, cor: produtoVariacoes.cor, preco: produtoVariacoes.preco })
    .from(produtoVariacoes)
    .where(and(eq(produtoVariacoes.produto_id, produtoId), eq(produtoVariacoes.loja_id, lojaId)))
    .orderBy(produtoVariacoes.ordem, produtoVariacoes.id);

  const grupos = await db
    .select({
      id: produtoOpcoesGrupos.id,
      titulo: produtoOpcoesGrupos.titulo,
      tipoSelecao: produtoOpcoesGrupos.tipo_selecao,
      obrigatorio: produtoOpcoesGrupos.obrigatorio,
      maxSelecao: produtoOpcoesGrupos.max_selecao,
    })
    .from(produtoOpcoesGrupos)
    .where(and(eq(produtoOpcoesGrupos.produto_id, produtoId), eq(produtoOpcoesGrupos.loja_id, lojaId)))
    .orderBy(produtoOpcoesGrupos.ordem, produtoOpcoesGrupos.id);

  const itens = grupos.length
    ? await db
        .select({ id: produtoOpcoesItens.id, grupoId: produtoOpcoesItens.grupo_id, nome: produtoOpcoesItens.nome, preco: produtoOpcoesItens.preco })
        .from(produtoOpcoesItens)
        .where(and(inArray(produtoOpcoesItens.grupo_id, grupos.map((g) => g.id)), eq(produtoOpcoesItens.loja_id, lojaId)))
        .orderBy(produtoOpcoesItens.ordem, produtoOpcoesItens.id)
    : [];

  const gruposOpcoes: GrupoOpcoesDetalhe[] = grupos.map((g) => ({
    id: g.id,
    titulo: g.titulo,
    tipoSelecao: g.tipoSelecao,
    obrigatorio: g.obrigatorio,
    maxSelecao: g.maxSelecao,
    itens: itens.filter((it) => it.grupoId === g.id).map((it) => ({ id: it.id, nome: it.nome, preco: it.preco })),
  }));

  return { ok: true, variacoes, variacoesTitulo: existe[0].variacoesTitulo, variacoesObrigatorio: existe[0].variacoesObrigatorio, gruposOpcoes };
}

export type ProdutoValidadeAviso = { id: number; nome: string | null; dataValidade: string; diasRestantes: number; vencido: boolean };

/* Equivalente de admin/api/v1/produtos_validade_check.php: produtos ativos vencendo em ate 2 dias (ou ja vencidos). */
export async function produtosValidadeCheck(lojaId: number): Promise<ProdutoValidadeAviso[]> {
  const DIAS_AVISO = 2;
  const diasRestantesExpr = sql<string>`(${produtos.data_validade}::date - current_date)`;

  const linhas = await db
    .select({ id: produtos.id, nome: produtos.nome, dataValidade: produtos.data_validade, diasRestantes: diasRestantesExpr })
    .from(produtos)
    .where(and(eq(produtos.loja_id, lojaId), eq(produtos.ativo, true), sql`${produtos.data_validade} is not null`, sql`${diasRestantesExpr} <= ${DIAS_AVISO}`))
    .orderBy(produtos.data_validade);

  return linhas.map((l) => {
    const diasRestantes = Number(l.diasRestantes);
    return { id: l.id, nome: l.nome, dataValidade: l.dataValidade as string, diasRestantes, vencido: diasRestantes < 0 };
  });
}
