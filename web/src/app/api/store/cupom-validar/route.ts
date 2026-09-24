import { NextResponse } from "next/server";
import { validarCupom } from "@/db/queries/cupons";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, msg: "Corpo invalido" }, { status: 400 });
  }

  const { loja_id, codigo, subtotal, tipo, taxa, cliente_id, telefone } = body as Record<string, unknown>;
  if (!loja_id || !codigo) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  const resultado = await validarCupom({
    lojaId: Number(loja_id),
    codigo: String(codigo),
    subtotal: Number(subtotal ?? 0),
    tipoPedido: typeof tipo === "string" ? tipo : undefined,
    taxaEntrega: taxa !== undefined ? Number(taxa) : undefined,
    clienteId: cliente_id !== undefined ? Number(cliente_id) : undefined,
    telefone: typeof telefone === "string" ? telefone : undefined,
  });

  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    codigo: resultado.codigo,
    tipo: resultado.tipo,
    desconto: resultado.desconto,
    valor: resultado.valor,
    primeira_compra: resultado.primeiraCompra ? 1 : 0,
    msg: resultado.msg,
  });
}
