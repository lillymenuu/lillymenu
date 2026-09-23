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
    extras: resultado.extras.map((e) => ({ id: e.id, nome: e.nome, preco: e.preco, obrigatorio: e.obrigatorio ? 1 : 0 })),
    complementos_itens: resultado.complementosItens.map((c) => ({ id: c.id, nome: c.nome, preco: c.preco, obrigatorio: c.obrigatorio ? 1 : 0 })),
  });
}
