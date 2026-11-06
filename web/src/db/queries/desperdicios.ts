import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { categorias, desperdicios, produtos } from "@/db/schema";
import {
  MOTIVOS,
  TIPOS,
  ehMotivo,
  ehTipo,
  type Desperdicio,
  type DesperdicioDashboard,
  type FiltrosDesperdicio,
  type MotivoDesperdicio,
  type OrigemDesperdicio,
  type ProdutoParaPerda,
  type TipoDesperdicio,
} from "@/lib/desperdicios";

/*
 * Controle de desperdicio (/desperdicios). Lancar perda de um produto cadastrado so guarda a
 * referencia pro relatorio — NAO baixa estoque nem gera movimentacao (decisao do lojista).
 */

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; msg: string };

function mesAtualFortaleza(): { mes: number; ano: number } {
  const [ano, mes] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  return { mes, ano };
}

/** Primeiro dia do mes (YYYY-MM-01) somando `deslocamento` meses. */
function inicioMes(ano: number, mes: number, deslocamento = 0): string {
  const d = new Date(Date.UTC(ano, mes - 1 + deslocamento, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function dataValida(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

function arredondar(v: number, casas = 2): number {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
}

const colunas = {
  id: desperdicios.id,
  data: desperdicios.data,
  tipo: desperdicios.tipo,
  motivo: desperdicios.motivo,
  origem: desperdicios.origem,
  produtoId: desperdicios.produto_id,
  descricao: desperdicios.descricao,
  quantidade: desperdicios.quantidade,
  custoUnitario: desperdicios.custo_unitario,
  total: desperdicios.total,
  observacao: desperdicios.observacao,
};

function normalizar(l: { [K in keyof typeof colunas]: unknown }): Desperdicio {
  return {
    id: Number(l.id),
    data: String(l.data),
    tipo: l.tipo as TipoDesperdicio,
    motivo: l.motivo as MotivoDesperdicio,
    origem: l.origem as OrigemDesperdicio,
    produtoId: l.produtoId === null ? null : Number(l.produtoId),
    descricao: String(l.descricao),
    quantidade: Number(l.quantidade),
    custoUnitario: Number(l.custoUnitario),
    total: Number(l.total),
    observacao: (l.observacao as string | null) ?? null,
  };
}

/* ---------------------------------------------------------------- leitura */

export async function listarProdutosParaPerda(lojaId: number): Promise<ProdutoParaPerda[]> {
  const linhas = await db
    .select({ id: produtos.id, nome: produtos.nome, categoria: categorias.nome, precoCusto: produtos.preco_custo })
    .from(produtos)
    .leftJoin(categorias, and(eq(categorias.id, produtos.categoria_id), eq(categorias.loja_id, produtos.loja_id)))
    .where(eq(produtos.loja_id, lojaId))
    .orderBy(asc(produtos.nome));
  return linhas.map((l) => ({ id: l.id, nome: l.nome ?? "", categoria: l.categoria, precoCusto: l.precoCusto === null ? null : Number(l.precoCusto) }));
}

export async function dashboardDesperdicio(lojaId: number, mesParam?: number, anoParam?: number): Promise<DesperdicioDashboard> {
  const atual = mesAtualFortaleza();
  const mes = mesParam && mesParam >= 1 && mesParam <= 12 ? mesParam : atual.mes;
  const ano = anoParam && anoParam >= 2000 && anoParam <= 2100 ? anoParam : atual.ano;

  const de = inicioMes(ano, mes);
  const ate = inicioMes(ano, mes, 1);
  const deAnterior = inicioMes(ano, mes, -1);
  const deEvolucao = inicioMes(ano, mes, -11);
  const doMes = and(eq(desperdicios.loja_id, lojaId), gte(desperdicios.data, de), lt(desperdicios.data, ate));

  const [lancamentosRaw, [anterior], evolucaoRaw, anosRaw] = await Promise.all([
    db.select(colunas).from(desperdicios).where(doMes).orderBy(desc(desperdicios.data), desc(desperdicios.id)),
    db
      .select({ total: sql<string>`coalesce(sum(${desperdicios.total}), 0)` })
      .from(desperdicios)
      .where(and(eq(desperdicios.loja_id, lojaId), gte(desperdicios.data, deAnterior), lt(desperdicios.data, de))),
    db
      .select({ ym: sql<string>`to_char(${desperdicios.data}, 'YYYY-MM')`, total: sql<string>`sum(${desperdicios.total})` })
      .from(desperdicios)
      .where(and(eq(desperdicios.loja_id, lojaId), gte(desperdicios.data, deEvolucao), lt(desperdicios.data, ate)))
      .groupBy(sql`to_char(${desperdicios.data}, 'YYYY-MM')`),
    db
      .selectDistinct({ ano: sql<number>`extract(year from ${desperdicios.data})::int` })
      .from(desperdicios)
      .where(eq(desperdicios.loja_id, lojaId)),
  ]);

  const lancamentos = lancamentosRaw.map(normalizar);

  const somar = <K extends string>(chave: (d: Desperdicio) => K) => {
    const mapa = new Map<K, { total: number; quantidade: number }>();
    for (const d of lancamentos) {
      const atualMapa = mapa.get(chave(d)) ?? { total: 0, quantidade: 0 };
      atualMapa.total += d.total;
      atualMapa.quantidade += d.quantidade;
      mapa.set(chave(d), atualMapa);
    }
    return mapa;
  };

  const porTipoMapa = somar((d) => d.tipo);
  const porMotivoMapa = somar((d) => d.motivo);
  const porItemMapa = somar((d) => (d.produtoId ? `p${d.produtoId}` : `a${d.descricao.trim().toLowerCase()}`));
  const nomeItem = new Map<string, string>();
  for (const d of lancamentos) nomeItem.set(d.produtoId ? `p${d.produtoId}` : `a${d.descricao.trim().toLowerCase()}`, d.descricao);

  const evolucaoMapa = new Map(evolucaoRaw.map((e) => [e.ym, Number(e.total)]));
  const evolucao = Array.from({ length: 12 }, (_, i) => {
    const [a, m] = inicioMes(ano, mes, i - 11).split("-").map(Number);
    return { mes: m, ano: a, total: arredondar(evolucaoMapa.get(`${a}-${String(m).padStart(2, "0")}`) ?? 0) };
  });

  const anos = [...new Set([...anosRaw.map((a) => Number(a.ano)), atual.ano, ano])].sort((x, y) => y - x);

  return {
    ok: true,
    mes,
    ano,
    anos,
    resumo: {
      total: arredondar(lancamentos.reduce((s, d) => s + d.total, 0)),
      totalMesAnterior: arredondar(Number(anterior?.total ?? 0)),
      quantidade: arredondar(lancamentos.reduce((s, d) => s + d.quantidade, 0), 3),
      lancamentos: lancamentos.length,
    },
    porTipo: TIPOS.map((t) => ({ id: t.id, label: t.label, total: arredondar(porTipoMapa.get(t.id)?.total ?? 0), quantidade: porTipoMapa.get(t.id)?.quantidade ?? 0 })).filter(
      (f) => f.total > 0
    ),
    porMotivo: MOTIVOS.map((m) => ({ id: m.id, label: m.label, total: arredondar(porMotivoMapa.get(m.id)?.total ?? 0), quantidade: porMotivoMapa.get(m.id)?.quantidade ?? 0 }))
      .filter((f) => f.total > 0)
      .sort((x, y) => y.total - x.total),
    topItens: [...porItemMapa.entries()]
      .map(([chave, v]) => ({ descricao: nomeItem.get(chave) ?? "", total: arredondar(v.total), quantidade: arredondar(v.quantidade, 3) }))
      .sort((x, y) => y.total - x.total)
      .slice(0, 10),
    evolucao,
    lancamentos,
  };
}

/** Lancamentos pros relatorios (PDF/Excel), com os filtros escolhidos. */
export async function listarDesperdicios(lojaId: number, f: FiltrosDesperdicio): Promise<Desperdicio[]> {
  const [aDe, mDe] = f.de.split("-").map(Number);
  const [aAte, mAte] = f.ate.split("-").map(Number);
  const condicoes = [eq(desperdicios.loja_id, lojaId), gte(desperdicios.data, inicioMes(aDe, mDe)), lt(desperdicios.data, inicioMes(aAte, mAte, 1))];
  if (f.tipo) condicoes.push(eq(desperdicios.tipo, f.tipo));
  if (f.motivo) condicoes.push(eq(desperdicios.motivo, f.motivo));
  if (f.origem) condicoes.push(eq(desperdicios.origem, f.origem));
  if (f.busca?.trim()) condicoes.push(ilike(desperdicios.descricao, `%${f.busca.trim()}%`));
  const linhas = await db
    .select(colunas)
    .from(desperdicios)
    .where(and(...condicoes))
    .orderBy(asc(desperdicios.data), asc(desperdicios.id));
  return linhas.map(normalizar);
}

/* ---------------------------------------------------------------- escrita */

export type ItemPerdaInput = {
  origem: OrigemDesperdicio;
  produtoId?: number | null;
  descricao?: string;
  tipo: TipoDesperdicio;
  quantidade: number;
  custoUnitario: number;
};

export type LotePerdaInput = { data: string; motivo: MotivoDesperdicio; observacao?: string; itens: ItemPerdaInput[] };

type ItemValidado = { origem: OrigemDesperdicio; produtoId: number | null; descricao: string; tipo: TipoDesperdicio; quantidade: number; custoUnitario: number };

async function validarItens(lojaId: number, itens: ItemPerdaInput[]): Promise<Resultado<{ itens: ItemValidado[] }>> {
  if (!Array.isArray(itens) || itens.length === 0) return { ok: false, msg: "Adicione ao menos um item." };

  const idsProduto = [...new Set(itens.filter((i) => i.origem === "produto").map((i) => Number(i.produtoId) || 0))].filter((id) => id > 0);
  const nomes = new Map<number, string>();
  if (idsProduto.length > 0) {
    const linhas = await db
      .select({ id: produtos.id, nome: produtos.nome })
      .from(produtos)
      .where(and(inArray(produtos.id, idsProduto), eq(produtos.loja_id, lojaId)));
    for (const l of linhas) nomes.set(l.id, l.nome ?? "");
  }

  const validados: ItemValidado[] = [];
  for (const i of itens) {
    const quantidade = arredondar(Number(i.quantidade), 3);
    const custoUnitario = arredondar(Number(i.custoUnitario));
    if (!ehTipo(i.tipo)) return { ok: false, msg: "Tipo de perda inválido." };
    if (!(quantidade > 0)) return { ok: false, msg: "Informe uma quantidade maior que zero." };
    if (!(custoUnitario >= 0)) return { ok: false, msg: "Informe um custo válido." };

    if (i.origem === "produto") {
      const produtoId = Number(i.produtoId) || 0;
      const nome = nomes.get(produtoId);
      if (!nome) return { ok: false, msg: "Produto não encontrado." };
      validados.push({ origem: "produto", produtoId, descricao: nome.slice(0, 160), tipo: i.tipo, quantidade, custoUnitario });
    } else if (i.origem === "avulsa") {
      const descricao = (i.descricao ?? "").trim();
      if (!descricao) return { ok: false, msg: "Informe a descrição da despesa avulsa." };
      validados.push({ origem: "avulsa", produtoId: null, descricao: descricao.slice(0, 160), tipo: i.tipo, quantidade, custoUnitario });
    } else {
      return { ok: false, msg: "Origem inválida." };
    }
  }
  return { ok: true, itens: validados };
}

export async function salvarLotePerda(lojaId: number, adminId: number, input: LotePerdaInput): Promise<Resultado<{ quantidade: number }>> {
  if (!dataValida(input.data)) return { ok: false, msg: "Informe a data da perda." };
  if (!ehMotivo(input.motivo)) return { ok: false, msg: "Informe o motivo da perda." };
  const v = await validarItens(lojaId, input.itens);
  if (!v.ok) return v;

  const observacao = (input.observacao ?? "").trim().slice(0, 255) || null;
  await db.insert(desperdicios).values(
    v.itens.map((i) => ({
      loja_id: lojaId,
      data: input.data,
      tipo: i.tipo,
      motivo: input.motivo,
      origem: i.origem,
      produto_id: i.produtoId,
      descricao: i.descricao,
      quantidade: i.quantidade,
      custo_unitario: i.custoUnitario,
      total: arredondar(i.quantidade * i.custoUnitario),
      observacao,
      admin_id: adminId,
    }))
  );
  return { ok: true, quantidade: v.itens.length };
}

export async function atualizarPerda(lojaId: number, id: number, input: LotePerdaInput): Promise<Resultado> {
  if (id <= 0) return { ok: false, msg: "Lançamento inválido." };
  if (!dataValida(input.data)) return { ok: false, msg: "Informe a data da perda." };
  if (!ehMotivo(input.motivo)) return { ok: false, msg: "Informe o motivo da perda." };
  if (input.itens?.length !== 1) return { ok: false, msg: "Na edição, o lançamento tem um item só." };
  const v = await validarItens(lojaId, input.itens);
  if (!v.ok) return v;
  const [i] = v.itens;

  const atualizados = await db
    .update(desperdicios)
    .set({
      data: input.data,
      motivo: input.motivo,
      tipo: i.tipo,
      origem: i.origem,
      produto_id: i.produtoId,
      descricao: i.descricao,
      quantidade: i.quantidade,
      custo_unitario: i.custoUnitario,
      total: arredondar(i.quantidade * i.custoUnitario),
      observacao: (input.observacao ?? "").trim().slice(0, 255) || null,
      atualizado_em: sql`now()`,
    })
    .where(and(eq(desperdicios.id, id), eq(desperdicios.loja_id, lojaId)))
    .returning({ id: desperdicios.id });
  return atualizados.length > 0 ? { ok: true } : { ok: false, msg: "Lançamento não encontrado." };
}

export async function excluirPerda(lojaId: number, id: number): Promise<Resultado> {
  const removidos = await db
    .delete(desperdicios)
    .where(and(eq(desperdicios.id, id), eq(desperdicios.loja_id, lojaId)))
    .returning({ id: desperdicios.id });
  return removidos.length > 0 ? { ok: true } : { ok: false, msg: "Lançamento não encontrado." };
}
