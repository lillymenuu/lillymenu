import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarCategorias, salvarCategoria, reordenarCategorias, excluirCategoria } from "@/db/queries/categoriasAdmin";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const categorias = await listarCategorias(sessao.lojaId);
  return NextResponse.json({
    ok: true,
    categorias: categorias.map((c) => ({ id: c.id, nome: c.nome, ativo: c.ativo ? 1 : 0, ordem: c.ordem, modo_exibicao: c.modoExibicao })),
  });
}

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const idRaw = body?.id;
  const resultado = await salvarCategoria(sessao.lojaId, {
    id: idRaw && Number(idRaw) > 0 ? Number(idRaw) : undefined,
    nome: typeof body?.nome === "string" ? body.nome : "",
    ativo: Boolean(body?.ativo),
    modoExibicao: typeof body?.modo_exibicao === "string" ? body.modo_exibicao : undefined,
  });
  return NextResponse.json(resultado);
}

export async function PUT(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ordem = Array.isArray(body?.ordem) ? body.ordem.map((n: unknown) => Number(n)) : [];
  const resultado = await reordenarCategorias(sessao.lojaId, ordem);
  return NextResponse.json(resultado);
}

export async function DELETE(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  const resultado = await excluirCategoria(sessao.lojaId, id);
  return NextResponse.json(resultado);
}
