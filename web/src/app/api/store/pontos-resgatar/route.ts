import { NextResponse } from "next/server";
import { resgatarPontos } from "@/db/queries/pontos";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, msg: "Corpo invalido" }, { status: 400 });
  }

  const { cliente_id, produto_id, loja_id, apenas_validar } = body as Record<string, unknown>;
  if (!cliente_id || !produto_id || !loja_id) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  const resultado = await resgatarPontos(Number(loja_id), Number(cliente_id), Number(produto_id), Boolean(apenas_validar));
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    msg: resultado.msg,
    produto: resultado.produto,
    custo: resultado.custo,
    saldo_antes: resultado.saldoAntes,
    saldo_novo: resultado.saldoNovo,
  });
}
