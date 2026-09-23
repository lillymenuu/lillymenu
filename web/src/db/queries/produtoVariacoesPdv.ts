import "server-only";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { produtoVariacoes, produtoExtras, produtoComplementosItens } from "@/db/schema";

/* Equivalente de admin/api/v1/pdv_produto_variacoes.php: variacoes/extras/complementos de um produto pro POS. */

export type VariacaoProdutoPdv = { id: number; tamanho: string | null; cor: string | null; preco: number };
export type ExtraOuComplementoPdv = { id: number; nome: string; preco: number; obrigatorio: boolean };

export type VariacoesProdutoPdvResultado = {
  variacoes: VariacaoProdutoPdv[];
  extras: ExtraOuComplementoPdv[];
  extrasObrigatorio: boolean;
  complementosItens: ExtraOuComplementoPdv[];
  complementosItensObrigatorio: boolean;
};

export async function variacoesProdutoPdv(lojaId: number, produtoId: number): Promise<{ ok: false; msg: string } & VariacoesProdutoPdvResultado | { ok: true } & VariacoesProdutoPdvResultado> {
  if (!produtoId) return { ok: false, msg: "Produto invalido.", variacoes: [], extras: [], extrasObrigatorio: false, complementosItens: [], complementosItensObrigatorio: false };

  const variacoesRaw = await db
    .select({ id: produtoVariacoes.id, tamanho: produtoVariacoes.tamanho, cor: produtoVariacoes.cor, preco: produtoVariacoes.preco })
    .from(produtoVariacoes)
    .where(and(eq(produtoVariacoes.produto_id, produtoId), eq(produtoVariacoes.ativo, true), eq(produtoVariacoes.loja_id, lojaId)))
    .orderBy(asc(produtoVariacoes.ordem), asc(produtoVariacoes.id));
  const variacoes = variacoesRaw.map((v) => ({ ...v, preco: Number(v.preco ?? 0) }));

  const extrasRaw = await db
    .select({ id: produtoExtras.id, nome: produtoExtras.nome, preco: produtoExtras.preco, obrigatorio: produtoExtras.obrigatorio })
    .from(produtoExtras)
    .where(and(eq(produtoExtras.produto_id, produtoId), eq(produtoExtras.ativo, true), eq(produtoExtras.loja_id, lojaId)))
    .orderBy(asc(produtoExtras.ordem), asc(produtoExtras.id));
  const extras = extrasRaw.map((e) => ({ ...e, preco: Number(e.preco ?? 0) }));
  const extrasObrigatorio = extras.some((e) => e.obrigatorio);

  const complementosRaw = await db
    .select({ id: produtoComplementosItens.id, nome: produtoComplementosItens.nome, preco: produtoComplementosItens.preco, obrigatorio: produtoComplementosItens.obrigatorio })
    .from(produtoComplementosItens)
    .where(and(eq(produtoComplementosItens.produto_id, produtoId), eq(produtoComplementosItens.ativo, true), eq(produtoComplementosItens.loja_id, lojaId)))
    .orderBy(asc(produtoComplementosItens.ordem), asc(produtoComplementosItens.id));
  const complementosItens = complementosRaw.map((c) => ({ ...c, preco: Number(c.preco ?? 0) }));
  const complementosItensObrigatorio = complementosItens.some((c) => c.obrigatorio);

  return { ok: true, variacoes, extras, extrasObrigatorio, complementosItens, complementosItensObrigatorio };
}
