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
    extras: resultado.extras.map((e) => ({ id: e.id, nome: e.nome, preco: e.preco, obrigatorio: e.obrigatorio ? 1 : 0 })),
    extras_obrigatorio: resultado.extrasObrigatorio ? 1 : 0,
    complementos_itens: resultado.complementosItens.map((c) => ({ id: c.id, nome: c.nome, preco: c.preco, obrigatorio: c.obrigatorio ? 1 : 0 })),
    complementos_itens_obrigatorio: resultado.complementosItensObrigatorio ? 1 : 0,
  });
}
