import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { validarCupom } from "@/db/queries/cupons";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await validarCupom({
    lojaId: sessao.lojaId,
    codigo: String(body.codigo ?? ""),
    subtotal: Number(body.subtotal ?? 0),
    tipoPedido: body.tipo ? String(body.tipo) : undefined,
    taxaEntrega: body.taxa !== undefined ? Number(body.taxa) : undefined,
    clienteId: body.cliente_id ? Number(body.cliente_id) : undefined,
  });

  return NextResponse.json(resultado);
}
