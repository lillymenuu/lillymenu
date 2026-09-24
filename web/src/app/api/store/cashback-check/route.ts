import { NextResponse } from "next/server";
import { checarCashback } from "@/db/queries/cashback";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tel = url.searchParams.get("tel") ?? "";
  const lojaId = Number(url.searchParams.get("loja_id") ?? "0");

  if (!tel || lojaId <= 0) {
    return NextResponse.json({ ok: false, saldo: 0 });
  }

  const resultado = await checarCashback(lojaId, tel);
  if (!resultado.ativo) return NextResponse.json({ ok: true, ativo: false, saldo: 0, pct: 0 });

  return NextResponse.json({
    ok: true,
    ativo: true,
    saldo: resultado.saldo,
    saldo_total: resultado.saldoTotal,
    pct: resultado.pct,
    clienteId: resultado.clienteId,
  });
}
