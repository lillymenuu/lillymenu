import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { cancelarTrabalhosPendentes, criarTrabalhosImpressao, statusTrabalhosImpressao } from "@/db/queries/impressaoFila";

/*
 * Fila de impressao entre computadores (lado de quem pede).
 * POST {pedido_id, perfis: string[]} cria; GET ?ids=1,2 acompanha; DELETE ?ids=1,2 desiste dos pendentes.
 */
function lerIds(request: NextRequest) {
  return (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 20);
}

export async function POST(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { pedido_id?: unknown; perfis?: unknown } | null;
  const pedidoId = Number(body?.pedido_id);
  const perfis = Array.isArray(body?.perfis) ? body.perfis.filter((p): p is string => typeof p === "string") : [];
  if (!Number.isInteger(pedidoId) || pedidoId <= 0 || !perfis.length) {
    return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });
  }
  return NextResponse.json(await criarTrabalhosImpressao(sessao.lojaId, pedidoId, perfis));
}

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });
  return NextResponse.json({ ok: true, trabalhos: await statusTrabalhosImpressao(sessao.lojaId, lerIds(request)) });
}

export async function DELETE(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });
  await cancelarTrabalhosPendentes(sessao.lojaId, lerIds(request));
  return NextResponse.json({ ok: true });
}
