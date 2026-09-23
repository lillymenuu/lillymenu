import "server-only";
import { and, eq, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { combos, comboPassos, comboPassoOpcoes, produtos, estoque } from "@/db/schema";

/*
 * Equivalente de admin/api/combo_get.php, usado tanto por
 * admin/api/v1/combo_detalhe.php (Produtos, admin novo) quanto por
 * admin/api/v1/pdv_combo_detalhe.php (POS) — os dois sao so pontes de
 * sessao pro mesmo arquivo legado.
 */

export type OpcaoComboPasso = { id: number; nome: string | null; preco: number; imagem: string | null; estoque: number; esgotado: boolean };
export type PassoCombo = { id: number; nome: string; descricao: string | null; obrigatorio: boolean; minItens: number; maxItens: number; permiteRepetir: boolean; opcoes: OpcaoComboPasso[] };
export type ComboDetalhe = { id: number; nome: string; descricao: string | null; imagem: string | null; tipoPreco: string; preco: number; precoPromocional: number | null; promoDesativado: boolean; ativo: boolean; categoriaId: number | null };

export async function detalheCombo(lojaId: number, comboId: number): Promise<{ ok: true; combo: ComboDetalhe; passos: PassoCombo[] } | { ok: false; msg: string }> {
  if (comboId <= 0) return { ok: false, msg: "ID inválido" };

  const [combo] = await db
    .select({
      id: combos.id,
      nome: combos.nome,
      descricao: combos.descricao,
      imagem: combos.imagem,
      tipoPreco: combos.tipo_preco,
      preco: combos.preco,
      precoPromocional: combos.preco_promocional,
      promoDesativado: combos.promo_desativado,
      ativo: combos.ativo,
      categoriaId: combos.categoria_id,
    })
    .from(combos)
    .where(and(eq(combos.id, comboId), eq(combos.loja_id, lojaId)))
    .limit(1);
  if (!combo) return { ok: false, msg: "Combo não encontrado" };

  const passosRaw = await db
    .select({ id: comboPassos.id, nome: comboPassos.nome, descricao: comboPassos.descricao, obrigatorio: comboPassos.obrigatorio, minItens: comboPassos.min_itens, maxItens: comboPassos.max_itens, permiteRepetir: comboPassos.permite_repetir })
    .from(comboPassos)
    .where(and(eq(comboPassos.combo_id, comboId), eq(comboPassos.loja_id, lojaId)))
    .orderBy(sql`${comboPassos.ordem} is null`, asc(comboPassos.ordem), asc(comboPassos.id));

  const passos: PassoCombo[] = [];
  for (const passo of passosRaw) {
    const opcoesRaw = await db
      .select({ id: comboPassoOpcoes.produto_id, nome: produtos.nome, preco: produtos.preco, imagem: produtos.imagem, estoque: estoque.quantidade })
      .from(comboPassoOpcoes)
      .innerJoin(produtos, and(eq(produtos.id, comboPassoOpcoes.produto_id), eq(produtos.loja_id, comboPassoOpcoes.loja_id)))
      .leftJoin(estoque, and(eq(estoque.produto_id, comboPassoOpcoes.produto_id), eq(estoque.loja_id, comboPassoOpcoes.loja_id)))
      .where(and(eq(comboPassoOpcoes.passo_id, passo.id), eq(comboPassoOpcoes.loja_id, lojaId)))
      .orderBy(sql`${comboPassoOpcoes.ordem} is null`, asc(comboPassoOpcoes.ordem), asc(comboPassoOpcoes.id));

    const opcoes: OpcaoComboPasso[] = opcoesRaw.map((o) => {
      const estoqueNum = o.estoque ?? 0;
      return { id: o.id, nome: o.nome, preco: Number(o.preco ?? 0), imagem: o.imagem, estoque: estoqueNum, esgotado: estoqueNum <= 0 };
    });

    passos.push({ id: passo.id, nome: passo.nome, descricao: passo.descricao, obrigatorio: passo.obrigatorio, minItens: passo.minItens, maxItens: passo.maxItens, permiteRepetir: passo.permiteRepetir, opcoes });
  }

  return {
    ok: true,
    combo: { ...combo, preco: Number(combo.preco ?? 0), precoPromocional: combo.precoPromocional !== null ? Number(combo.precoPromocional) : null },
    passos,
  };
}
