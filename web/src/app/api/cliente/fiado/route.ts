import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { registrarFiado } from "@/db/queries/fiado";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const clienteId = Number(body?.cliente_id ?? 0);
  const valor = Number(body?.valor ?? 0);
  const observacao = typeof body?.observacao === "string" ? body.observacao : "";

  const resultado = await registrarFiado(sessao.lojaId, sessao.id, clienteId, valor, observacao);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({ ok: true, saldo_fiado: resultado.saldoFiado });
}
