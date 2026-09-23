import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { catalogoPdv } from "@/db/queries/pdvCatalogo";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const resultado = await catalogoPdv(sessao.lojaId);

  return NextResponse.json({
    ok: true,
    categorias: resultado.categorias,
    produtos: resultado.produtos.map((p) => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      categoria_id: p.categoriaId,
      preco: p.preco,
      preco_promocional: p.precoPromocional,
      tem_variacoes: p.temVariacoes,
      imagem: p.imagem,
      pontos_ganho: p.pontosGanho,
      pontos_custo: p.pontosCusto,
      estoque: p.estoque,
      grupo_estoque_id: p.grupoEstoqueId,
    })),
    combos: resultado.combos.map((c) => ({
      id: c.id,
      nome: c.nome,
      categoria_id: c.categoriaId,
      imagem: c.imagem,
      tipo_preco: c.tipoPreco,
      preco: c.preco,
      preco_promocional: c.precoPromocional,
    })),
  });
}
