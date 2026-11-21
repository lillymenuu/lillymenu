import { NextResponse } from "next/server";
import { resgatarPontos } from "@/db/queries/pontos";
import { conferirTokenCliente } from "@/db/queries/tokenPublico";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, msg: "Corpo invalido" }, { status: 400 });
  }

  const { cliente_id, cliente_token, produto_id, loja_id } = body as Record<string, unknown>;
  if (!cliente_id || !produto_id || !loja_id) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }
  /* cliente_id e sequencial: sem o token entregue no login por telefone, qualquer um mexia nos pontos de outro cliente. */
  if (!conferirTokenCliente(Number(loja_id), Number(cliente_id), String(cliente_token ?? ""))) {
    return NextResponse.json({ ok: false, msg: "Entre novamente com seu telefone." }, { status: 403 });
  }

  /* So valida: o debito acontece uma unica vez, na criacao do pedido (antes debitava aqui E no
     pedido, e o cliente perdia os pontos em dobro ou ao tirar o item do carrinho). */
  const resultado = await resgatarPontos(Number(loja_id), Number(cliente_id), Number(produto_id), true);
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
