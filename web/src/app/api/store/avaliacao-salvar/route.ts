import { NextResponse } from "next/server";
import { salvarAvaliacaoCliente } from "@/db/queries/avaliacoes";
import { conferirTokenPedido } from "@/db/queries/tokenPublico";

export async function POST(request: Request) {
  const body = await request.formData().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, msg: "Corpo invalido" }, { status: 400 });
  }

  const pedidoId = body.get("pedido_id");
  const nota = body.get("nota");
  const descricao = body.get("descricao");
  const lojaId = body.get("loja_id");

  if (!pedidoId || !nota || !lojaId) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }
  /* pedido_id e sequencial: sem o token do pedido, qualquer um avaliava (ou sobrescrevia a avaliacao de) qualquer pedido. */
  if (!conferirTokenPedido(Number(pedidoId), String(body.get("token") ?? ""))) {
    return NextResponse.json({ ok: false, msg: "Acesso negado" }, { status: 403 });
  }

  const resultado = await salvarAvaliacaoCliente(Number(lojaId), Number(pedidoId), Number(nota), descricao ? String(descricao) : "");
  return NextResponse.json(resultado);
}
