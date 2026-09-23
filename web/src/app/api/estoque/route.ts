import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheEstoque, salvarEstoque, excluirEstoque } from "@/db/queries/estoqueAdmin";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const produtoId = Number(request.nextUrl.searchParams.get("produto_id") ?? 0);
  const resultado = await detalheEstoque(sessao.lojaId, produtoId);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    quantidade: resultado.quantidade,
    quantidade_minima: resultado.quantidadeMinima,
    vinculados: resultado.vinculados.map((v) => ({ id: v.id, nome: v.nome })),
  });
}

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const produtoId = Number(body?.produto_id ?? 0);
  const quantidade = Number(body?.quantidade ?? 0);
  const quantidadeMinima = Number(body?.quantidade_minima ?? 0);

  const resultado = await salvarEstoque(sessao.lojaId, produtoId, quantidade, quantidadeMinima);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({ ok: true, quantidade: resultado.quantidade, quantidade_minima: resultado.quantidadeMinima });
}

export async function DELETE(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const produtoId = Number(body?.produto_id ?? 0);

  const resultado = await excluirEstoque(sessao.lojaId, produtoId);
  return NextResponse.json(resultado);
}
