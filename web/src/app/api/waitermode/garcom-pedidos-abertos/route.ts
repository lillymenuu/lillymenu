import { NextResponse } from "next/server";
import { getSessaoGarcom } from "@/lib/session";
import { pedidosAbertosGarcom } from "@/db/queries/modoGarcom";

export async function GET() {
  const sessao = await getSessaoGarcom();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Sessão do garçom expirada." }, { status: 401 });

  const pedidos = await pedidosAbertosGarcom(sessao.lojaId);
  return NextResponse.json({ ok: true, pedidos });
}
