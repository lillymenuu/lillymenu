import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { variacoesProdutoPdv } from "@/db/queries/produtoVariacoesPdv";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id") ?? "0");
  const resultado = await variacoesProdutoPdv(sessao.lojaId, id);

  return NextResponse.json({
    ok: resultado.ok,
    msg: "msg" in resultado ? resultado.msg : undefined,
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
