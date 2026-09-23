import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarMotoboysParaVinculo, vincularMotoboy } from "@/db/queries/motoboys";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const pedidoId = Number(request.nextUrl.searchParams.get("pedido_id") ?? "0");
  const resultado = await listarMotoboysParaVinculo(sessao.lojaId, pedidoId);
  return NextResponse.json({ ok: true, motoboys: resultado.motoboys, selected_id: resultado.selectedId });
}

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const pedidoId = Number(body.pedido_id ?? 0);
  const motoboyId = Number(body.motoboy_id ?? 0);
  const resultado = await vincularMotoboy(sessao.lojaId, pedidoId, motoboyId);
  if (!resultado.ok) return NextResponse.json(resultado);
  return NextResponse.json({ ok: true, msg: resultado.msg, motoboy_nome: resultado.motoboyNome });
}
