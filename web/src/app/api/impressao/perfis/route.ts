import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { excluirImpressoraLoja, listarImpressorasLoja, salvarImpressoraLoja } from "@/db/queries/impressoras";

/* Impressoras da loja (compartilhadas entre os computadores). GET lista, POST salva uma, DELETE apaga uma. */
export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });
  return NextResponse.json({ ok: true, perfis: await listarImpressorasLoja(sessao.lojaId) });
}

export async function POST(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { perfil?: Record<string, unknown> } | null;
  if (!body?.perfil || typeof body.perfil !== "object") return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });
  return NextResponse.json(await salvarImpressoraLoja(sessao.lojaId, body.perfil));
}

export async function DELETE(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ ok: false, msg: "Impressora invalida." }, { status: 400 });
  return NextResponse.json(await excluirImpressoraLoja(sessao.lojaId, id));
}
