import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheVariacoesProduto } from "@/db/queries/produtosAdmin";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id") ?? 0);

  const resultado = await detalheVariacoesProduto(sessao.lojaId, id);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    variacoes: resultado.variacoes,
    variacoes_titulo: resultado.variacoesTitulo,
    variacoes_obrigatorio: resultado.variacoesObrigatorio ? 1 : 0,
    grupos_opcoes: resultado.gruposOpcoes.map((g) => ({
      id: g.id,
      titulo: g.titulo,
      tipo_selecao: g.tipoSelecao,
      obrigatorio: g.obrigatorio ? 1 : 0,
      itens: g.itens.map((it) => ({ id: it.id, nome: it.nome, preco: it.preco })),
    })),
  });
}
