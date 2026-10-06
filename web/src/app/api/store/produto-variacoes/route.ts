import { NextResponse } from "next/server";
import { variacoesProdutoPdv } from "@/db/queries/produtoVariacoesPdv";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const produtoId = Number(url.searchParams.get("produto_id") ?? "0");
  const lojaId = Number(url.searchParams.get("loja_id") ?? "0");

  if (produtoId <= 0 || lojaId <= 0) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  const resultado = await variacoesProdutoPdv(lojaId, produtoId);

  return NextResponse.json({
    ok: resultado.ok,
    variacoes: resultado.variacoes,
    variacao_titulo: resultado.variacaoTitulo,
    variacao_obrigatorio: resultado.variacaoObrigatorio ? 1 : 0,
    grupos_opcoes: resultado.gruposOpcoes.map((g) => ({
      id: g.id,
      titulo: g.titulo,
      tipo_selecao: g.tipoSelecao,
      obrigatorio: g.obrigatorio ? 1 : 0,
      max_selecao: g.maxSelecao,
      itens: g.itens.map((it) => ({ id: it.id, nome: it.nome, preco: it.preco })),
    })),
  });
}
