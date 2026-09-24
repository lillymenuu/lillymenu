import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarProdutosVinculo, salvarVinculoEstoque } from "@/db/queries/estoqueVinculo";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const produtoId = Number(params.get("produto_id") ?? "0");
  const search = params.get("search") ?? "";

  const resultado = await listarProdutosVinculo(sessao.lojaId, produtoId, search);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    produtos: resultado.produtos.map((p) => ({ id: p.id, nome: p.nome, imagem: p.imagem, categoria_id: p.categoriaId, vinculado: p.vinculado })),
  });
}

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await salvarVinculoEstoque(sessao.lojaId, {
    produtoId: Number(body.produto_id ?? 0),
    produtoIds: Array.isArray(body.produto_ids) ? body.produto_ids.map((v: unknown) => Number(v)) : [],
  });

  return NextResponse.json(resultado);
}
