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
    extras: resultado.extras.map((e) => ({ id: e.id, nome: e.nome, preco: e.preco, obrigatorio: e.obrigatorio ? 1 : 0 })),
    extras_obrigatorio: resultado.extrasObrigatorio ? 1 : 0,
    complementos_itens: resultado.complementosItens.map((c) => ({ id: c.id, nome: c.nome, preco: c.preco, obrigatorio: c.obrigatorio ? 1 : 0 })),
    complementos_itens_obrigatorio: resultado.complementosItensObrigatorio ? 1 : 0,
  });
}
