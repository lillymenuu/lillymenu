import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { finalizarPedido } from "@/db/queries/pedidosStatus";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id ?? 0);
  const resultado = await finalizarPedido(sessao.lojaId, sessao.id, id);
  return NextResponse.json(resultado);
}
