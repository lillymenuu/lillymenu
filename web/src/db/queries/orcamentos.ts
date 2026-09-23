import "server-only";
import { and, eq, asc, desc, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { orcamentos, orcamentoItens, produtos, categorias, estoque } from "@/db/schema";

/*
 * Equivalente de admin/api/v1/orcamentos_listar.php, orcamentos_detalhe.php,
 * orcamentos_salvar.php, orcamentos_status.php, orcamentos_excluir.php e
 * orcamentos_produtos.php: tela de Orcamentos (/quotes) — feature sem
 * persistencia no legado (orcamentos_pdf.php so gerava um PDF efemero),
 * reconstruida aqui com o mesmo modelo ja usado no dump (orcamentos/
 * orcamento_itens).
 *
 * Geracao de PDF (orcamentos_pdf.php) fica FORA desta etapa por decisao
 * deliberada: e renderizacao de template HTML->PDF, nao uma query de
 * dados, e pertence a uma rota/servico dedicado no lado Next.js, nao a
 * este arquivo de queries.
 */

export type OrcamentoResumo = { id: number; status: string; clienteNome: string; total: number; itensCount: number; criadoEm: string; atualizadoEm: string | null };

const STATUS_VALIDOS = ["pendente", "aprovado", "recusado"] as const;

export async function listarOrcamentos(lojaId: number, statusFiltro: string): Promise<OrcamentoResumo[]> {
  const condicao = (STATUS_VALIDOS as readonly string[]).includes(statusFiltro)
    ? and(eq(orcamentos.loja_id, lojaId), eq(orcamentos.status, statusFiltro as (typeof STATUS_VALIDOS)[number]))
    : eq(orcamentos.loja_id, lojaId);

  const linhas = await db
    .select({
      id: orcamentos.id,
      status: orcamentos.status,
      clienteNome: orcamentos.cliente_nome,
      total: orcamentos.total,
      criadoEm: orcamentos.criado_em,
      atualizadoEm: orcamentos.atualizado_em,
      itensCount: sql<string>`count(${orcamentoItens.id})`,
    })
    .from(orcamentos)
    .leftJoin(orcamentoItens, eq(orcamentoItens.orcamento_id, orcamentos.id))
    .where(condicao)
    .groupBy(orcamentos.id)
    .orderBy(desc(orcamentos.criado_em), desc(orcamentos.id));

  return linhas.map((l) => ({ ...l, itensCount: Number(l.itensCount) }));
}

export type ItemOrcamento = { id: number; produtoId: number | null; nome: string; preco: number; qtd: number; observacoes: string | null };
export type OrcamentoDetalhe = {
  id: number;
  status: string;
  clienteNome: string;
  clienteTipoDocumento: string;
  clienteDocumento: string | null;
  clienteWhatsapp: string | null;
  clienteEndereco: string | null;
  descontoTipo: string;
  descontoValor: number;
  subtotal: number;
  total: number;
  criadoEm: string;
  atualizadoEm: string | null;
};

export async function detalheOrcamento(lojaId: number, id: number): Promise<{ ok: true; orcamento: OrcamentoDetalhe; itens: ItemOrcamento[] } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "Orçamento inválido." };

  const [o] = await db.select().from(orcamentos).where(and(eq(orcamentos.id, id), eq(orcamentos.loja_id, lojaId))).limit(1);
  if (!o) return { ok: false, msg: "Orçamento não encontrado." };

  const itensRaw = await db
    .select({ id: orcamentoItens.id, produtoId: orcamentoItens.produto_id, nome: orcamentoItens.nome, preco: orcamentoItens.preco, qtd: orcamentoItens.qtd, observacoes: orcamentoItens.observacoes })
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamento_id, id))
    .orderBy(asc(orcamentoItens.id));

  return {
    ok: true,
    orcamento: {
      id: o.id,
      status: o.status,
      clienteNome: o.cliente_nome,
      clienteTipoDocumento: o.cliente_tipo_documento,
      clienteDocumento: o.cliente_documento,
      clienteWhatsapp: o.cliente_whatsapp,
      clienteEndereco: o.cliente_endereco,
      descontoTipo: o.desconto_tipo,
      descontoValor: o.desconto_valor,
      subtotal: o.subtotal,
      total: o.total,
      criadoEm: o.criado_em,
      atualizadoEm: o.atualizado_em,
    },
    itens: itensRaw,
  };
}

export type SalvarOrcamentoItemInput = { produtoId?: number | null; nome: string; preco: number | string; qtd: number | string; observacoes?: string };

export type SalvarOrcamentoInput = {
  id?: number;
  clienteNome: string;
  clienteTipoDocumento?: string;
  clienteDocumento?: string;
  clienteWhatsapp?: string;
  clienteEndereco?: string;
  descontoTipo?: string;
  descontoValor?: number | string;
  itens: SalvarOrcamentoItemInput[];
};

export async function salvarOrcamento(lojaId: number, adminId: number, input: SalvarOrcamentoInput): Promise<{ ok: true; msg: string; id: number } | { ok: false; msg: string }> {
  const id = input.id && input.id > 0 ? input.id : 0;
  const clienteNome = input.clienteNome.trim();
  const clienteTipoDocumentoRaw = input.clienteTipoDocumento ?? "fisica";
  const clienteTipoDocumento = clienteTipoDocumentoRaw === "juridica" ? "juridica" : "fisica";
  const clienteDocumento = (input.clienteDocumento ?? "").trim();
  const clienteWhatsapp = (input.clienteWhatsapp ?? "").trim();
  const clienteEndereco = (input.clienteEndereco ?? "").trim();
  const descontoTipoRaw = input.descontoTipo ?? "valor";
  const descontoTipo = descontoTipoRaw === "percent" ? "percent" : "valor";
  let descontoValor = Number(input.descontoValor ?? 0);
  if (descontoValor < 0) descontoValor = 0;

  if (clienteNome === "") return { ok: false, msg: "Nome do cliente é obrigatório." };

  const itens: { produtoId: number | null; nome: string; preco: number; qtd: number; observacoes: string | null }[] = [];
  for (const item of input.itens ?? []) {
    const nome = item.nome.trim();
    const qtd = parseInt(String(item.qtd ?? 0), 10);
    const preco = Number(item.preco ?? 0);
    if (nome === "" || qtd <= 0) continue;
    itens.push({
      produtoId: item.produtoId ? Number(item.produtoId) : null,
      nome,
      preco,
      qtd,
      observacoes: (item.observacoes ?? "").trim() || null,
    });
  }

  if (itens.length === 0) return { ok: false, msg: "Adicione ao menos um item." };

  const subtotal = itens.reduce((acc, item) => acc + item.preco * item.qtd, 0);
  const descontoAplicado = descontoTipo === "percent" ? (subtotal * descontoValor) / 100 : descontoValor;
  const total = Math.max(0, subtotal - descontoAplicado);

  if (id > 0) {
    const [existente] = await db.select({ id: orcamentos.id }).from(orcamentos).where(and(eq(orcamentos.id, id), eq(orcamentos.loja_id, lojaId))).limit(1);
    if (!existente) return { ok: false, msg: "Orçamento não encontrado." };

    await withTransaction(async (tx) => {
      await tx
        .update(orcamentos)
        .set({
          cliente_nome: clienteNome,
          cliente_tipo_documento: clienteTipoDocumento,
          cliente_documento: clienteDocumento || null,
          cliente_whatsapp: clienteWhatsapp || null,
          cliente_endereco: clienteEndereco || null,
          desconto_tipo: descontoTipo,
          desconto_valor: descontoValor,
          subtotal,
          total,
          atualizado_em: sql`now()`,
        })
        .where(and(eq(orcamentos.id, id), eq(orcamentos.loja_id, lojaId)));

      await tx.delete(orcamentoItens).where(eq(orcamentoItens.orcamento_id, id));
      for (const item of itens) {
        await tx.insert(orcamentoItens).values({ orcamento_id: id, produto_id: item.produtoId, nome: item.nome, preco: item.preco, qtd: item.qtd, observacoes: item.observacoes });
      }
    });

    return { ok: true, msg: "Orçamento atualizado.", id };
  }

  let novoId = 0;
  await withTransaction(async (tx) => {
    const [novo] = await tx
      .insert(orcamentos)
      .values({
        loja_id: lojaId,
        status: "pendente",
        cliente_nome: clienteNome,
        cliente_tipo_documento: clienteTipoDocumento,
        cliente_documento: clienteDocumento || null,
        cliente_whatsapp: clienteWhatsapp || null,
        cliente_endereco: clienteEndereco || null,
        desconto_tipo: descontoTipo,
        desconto_valor: descontoValor,
        subtotal,
        total,
        admin_id: adminId || null,
      })
      .returning({ id: orcamentos.id });
    novoId = novo.id;

    for (const item of itens) {
      await tx.insert(orcamentoItens).values({ orcamento_id: novoId, produto_id: item.produtoId, nome: item.nome, preco: item.preco, qtd: item.qtd, observacoes: item.observacoes });
    }
  });

  return { ok: true, msg: "Orçamento salvo.", id: novoId };
}

export async function atualizarStatusOrcamento(lojaId: number, id: number, status: string): Promise<{ ok: true; msg: string } | { ok: false; msg: string }> {
  if (!(STATUS_VALIDOS as readonly string[]).includes(status)) return { ok: false, msg: "Status inválido." };

  const atualizados = await db
    .update(orcamentos)
    .set({ status: status as (typeof STATUS_VALIDOS)[number], atualizado_em: sql`now()` })
    .where(and(eq(orcamentos.id, id), eq(orcamentos.loja_id, lojaId)))
    .returning({ id: orcamentos.id });

  if (atualizados.length === 0) {
    const [existe] = await db.select({ id: orcamentos.id }).from(orcamentos).where(and(eq(orcamentos.id, id), eq(orcamentos.loja_id, lojaId))).limit(1);
    if (!existe) return { ok: false, msg: "Orçamento não encontrado." };
  }

  return { ok: true, msg: "Status atualizado." };
}

export async function excluirOrcamento(lojaId: number, id: number): Promise<{ ok: true; msg: string } | { ok: false; msg: string }> {
  const excluidos = await db.delete(orcamentos).where(and(eq(orcamentos.id, id), eq(orcamentos.loja_id, lojaId))).returning({ id: orcamentos.id });
  if (excluidos.length === 0) return { ok: false, msg: "Orçamento não encontrado." };
  return { ok: true, msg: "Orçamento apagado." };
}

export type ProdutoParaOrcamento = { id: number; nome: string | null; preco: number; estoque: number; imagem: string | null };

export async function produtosParaOrcamento(lojaId: number): Promise<ProdutoParaOrcamento[]> {
  const precoExpr = sql<string>`case when ${produtos.promo_desativado} = false and ${produtos.preco_promocional} is not null and ${produtos.preco_promocional} > 0 then ${produtos.preco_promocional} else ${produtos.preco} end`;

  const linhas = await db
    .select({
      id: produtos.id,
      nome: produtos.nome,
      preco: precoExpr,
      estoque: estoque.quantidade,
      imagem: produtos.imagem,
      categoriaOrdem: categorias.ordem,
      categoriaNome: categorias.nome,
      produtoOrdem: produtos.ordem,
    })
    .from(produtos)
    .leftJoin(categorias, and(eq(categorias.id, produtos.categoria_id), eq(categorias.loja_id, produtos.loja_id)))
    .leftJoin(estoque, and(eq(estoque.produto_id, produtos.id), eq(estoque.loja_id, produtos.loja_id)))
    .where(and(eq(produtos.ativo, true), eq(produtos.loja_id, lojaId)))
    .orderBy(sql`${categorias.ordem} is null`, asc(categorias.ordem), asc(categorias.nome), sql`${produtos.ordem} is null`, asc(produtos.ordem), asc(produtos.nome));

  return linhas.map((l) => ({ id: l.id, nome: l.nome, preco: Number(l.preco), estoque: l.estoque ?? 0, imagem: l.imagem }));
}
