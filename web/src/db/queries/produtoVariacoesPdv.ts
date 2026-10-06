import "server-only";
import { and, eq, inArray, asc } from "drizzle-orm";
import { db } from "@/db";
import { produtos, produtoVariacoes, produtoOpcoesGrupos, produtoOpcoesItens } from "@/db/schema";

/* Equivalente de admin/api/v1/pdv_produto_variacoes.php: variacoes/grupos de opcoes de um produto pro POS/loja. */

export type VariacaoProdutoPdv = { id: number; tamanho: string | null; cor: string | null; preco: number };
export type OpcaoItemPdv = { id: number; nome: string; preco: number };
export type GrupoOpcoesPdv = { id: number; titulo: string; tipoSelecao: "unica" | "multipla"; obrigatorio: boolean; maxSelecao: number; itens: OpcaoItemPdv[] };

export type VariacoesProdutoPdvResultado = {
  variacoes: VariacaoProdutoPdv[];
  variacaoTitulo: string | null;
  variacaoObrigatorio: boolean;
  gruposOpcoes: GrupoOpcoesPdv[];
};

export async function variacoesProdutoPdv(
  lojaId: number,
  produtoId: number
): Promise<({ ok: false; msg: string } & VariacoesProdutoPdvResultado) | ({ ok: true } & VariacoesProdutoPdvResultado)> {
  if (!produtoId) {
    return { ok: false, msg: "Produto invalido.", variacoes: [], variacaoTitulo: null, variacaoObrigatorio: true, gruposOpcoes: [] };
  }

  const [produto] = await db
    .select({ variacaoTitulo: produtos.variacoes_titulo, variacaoObrigatorio: produtos.variacoes_obrigatorio })
    .from(produtos)
    .where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId)))
    .limit(1);

  const variacoesRaw = await db
    .select({ id: produtoVariacoes.id, tamanho: produtoVariacoes.tamanho, cor: produtoVariacoes.cor, preco: produtoVariacoes.preco })
    .from(produtoVariacoes)
    .where(and(eq(produtoVariacoes.produto_id, produtoId), eq(produtoVariacoes.ativo, true), eq(produtoVariacoes.loja_id, lojaId)))
    .orderBy(asc(produtoVariacoes.ordem), asc(produtoVariacoes.id));
  const variacoes = variacoesRaw.map((v) => ({ ...v, preco: Number(v.preco ?? 0) }));

  const gruposRaw = await db
    .select({
      id: produtoOpcoesGrupos.id,
      titulo: produtoOpcoesGrupos.titulo,
      tipoSelecao: produtoOpcoesGrupos.tipo_selecao,
      obrigatorio: produtoOpcoesGrupos.obrigatorio,
      maxSelecao: produtoOpcoesGrupos.max_selecao,
    })
    .from(produtoOpcoesGrupos)
    .where(and(eq(produtoOpcoesGrupos.produto_id, produtoId), eq(produtoOpcoesGrupos.loja_id, lojaId)))
    .orderBy(asc(produtoOpcoesGrupos.ordem), asc(produtoOpcoesGrupos.id));

  const itensRaw = gruposRaw.length
    ? await db
        .select({ id: produtoOpcoesItens.id, grupoId: produtoOpcoesItens.grupo_id, nome: produtoOpcoesItens.nome, preco: produtoOpcoesItens.preco })
        .from(produtoOpcoesItens)
        .where(and(inArray(produtoOpcoesItens.grupo_id, gruposRaw.map((g) => g.id)), eq(produtoOpcoesItens.loja_id, lojaId)))
        .orderBy(asc(produtoOpcoesItens.ordem), asc(produtoOpcoesItens.id))
    : [];

  const gruposOpcoes: GrupoOpcoesPdv[] = gruposRaw.map((g) => ({
    id: g.id,
    titulo: g.titulo,
    tipoSelecao: g.tipoSelecao,
    obrigatorio: g.obrigatorio,
    maxSelecao: g.maxSelecao,
    itens: itensRaw.filter((it) => it.grupoId === g.id).map((it) => ({ id: it.id, nome: it.nome, preco: Number(it.preco ?? 0) })),
  }));

  return {
    ok: true,
    variacoes,
    variacaoTitulo: produto?.variacaoTitulo ?? null,
    variacaoObrigatorio: produto?.variacaoObrigatorio ?? true,
    gruposOpcoes,
  };
}
