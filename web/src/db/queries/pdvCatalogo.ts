import "server-only";
import { and, eq, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { categorias, produtos, estoque, estoqueGrupoMembros, combos } from "@/db/schema";

/* Equivalente de admin/api/v1/pdv_catalogo.php: catalogo completo pro POS (/pos). */

export type CategoriaPdv = { id: number; nome: string | null };

export type ProdutoPdv = {
  id: number;
  nome: string | null;
  descricao: string | null;
  categoriaId: number | null;
  preco: number;
  precoPromocional: number | null;
  temVariacoes: boolean;
  imagem: string | null;
  pontosGanho: number;
  pontosCusto: number;
  estoque: number;
  grupoEstoqueId: number | null;
};

export type ComboPdv = {
  id: number;
  nome: string;
  categoriaId: number | null;
  imagem: string | null;
  tipoPreco: string;
  preco: number;
  precoPromocional: number | null;
};

export type CatalogoPdvResultado = { categorias: CategoriaPdv[]; produtos: ProdutoPdv[]; combos: ComboPdv[] };

export async function catalogoPdv(lojaId: number): Promise<CatalogoPdvResultado> {
  const categoriasRaw = await db
    .select({ id: categorias.id, nome: categorias.nome })
    .from(categorias)
    .where(and(eq(categorias.loja_id, lojaId), eq(categorias.ativo, true)))
    .orderBy(sql`${categorias.ordem} is null`, asc(categorias.ordem), asc(categorias.nome));

  const produtosRaw = await db
    .select({
      id: produtos.id,
      nome: produtos.nome,
      descricao: produtos.descricao,
      categoriaId: produtos.categoria_id,
      preco: produtos.preco,
      precoPromocional: produtos.preco_promocional,
      promoDesativado: produtos.promo_desativado,
      temVariacoes: produtos.tem_variacoes,
      imagem: produtos.imagem,
      pontosGanho: produtos.pontos_ganho,
      pontosCusto: produtos.pontos_custo,
      estoque: estoque.quantidade,
      grupoEstoqueId: estoqueGrupoMembros.grupo_id,
    })
    .from(produtos)
    .leftJoin(estoque, and(eq(estoque.produto_id, produtos.id), eq(estoque.loja_id, produtos.loja_id)))
    .leftJoin(estoqueGrupoMembros, and(eq(estoqueGrupoMembros.produto_id, produtos.id), eq(estoqueGrupoMembros.loja_id, produtos.loja_id)))
    .where(and(eq(produtos.loja_id, lojaId), eq(produtos.ativo, true), eq(produtos.disponivel_catalogo, true)))
    .orderBy(sql`${produtos.ordem} is null`, asc(produtos.ordem), asc(produtos.nome));

  const produtosResultado: ProdutoPdv[] = produtosRaw.map((p) => {
    const emPromo = p.precoPromocional !== null && Number(p.precoPromocional) > 0 && !p.promoDesativado;
    return {
      id: p.id,
      nome: p.nome,
      descricao: p.descricao && p.descricao.trim() !== "" ? p.descricao : null,
      categoriaId: p.categoriaId,
      preco: Number(p.preco ?? 0),
      precoPromocional: emPromo ? Number(p.precoPromocional) : null,
      temVariacoes: p.temVariacoes,
      imagem: p.imagem,
      pontosGanho: p.pontosGanho ?? 0,
      pontosCusto: p.pontosCusto ?? 0,
      estoque: p.estoque ?? 0,
      grupoEstoqueId: p.grupoEstoqueId,
    };
  });

  const combosRaw = await db
    .select({ id: combos.id, nome: combos.nome, categoriaId: combos.categoria_id, imagem: combos.imagem, tipoPreco: combos.tipo_preco, preco: combos.preco, precoPromocional: combos.preco_promocional, promoDesativado: combos.promo_desativado })
    .from(combos)
    .where(and(eq(combos.loja_id, lojaId), eq(combos.ativo, true)))
    .orderBy(sql`${combos.ordem} is null`, asc(combos.ordem), asc(combos.nome));

  const combosResultado: ComboPdv[] = combosRaw.map((c) => {
    const emPromo = c.precoPromocional !== null && Number(c.precoPromocional) > 0 && !c.promoDesativado;
    return { id: c.id, nome: c.nome, categoriaId: c.categoriaId, imagem: c.imagem, tipoPreco: c.tipoPreco, preco: Number(c.preco ?? 0), precoPromocional: emPromo ? Number(c.precoPromocional) : null };
  });

  return { categorias: categoriasRaw, produtos: produtosResultado, combos: combosResultado };
}
