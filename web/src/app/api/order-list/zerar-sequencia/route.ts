import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { zerarSequenciaPedidos } from "@/db/queries/pedidosAdmin";

export async function POST() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  try {
    const resultado = await zerarSequenciaPedidos(sessao.lojaId);
    return NextResponse.json(resultado);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido.";
    return NextResponse.json({ ok: false, msg: `Erro: ${msg}` });
  }
}
