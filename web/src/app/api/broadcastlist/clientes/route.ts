import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { clientesElegiveis } from "@/db/queries/broadcastList";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const clientes = await clientesElegiveis(sessao.lojaId);
  return NextResponse.json({ ok: true, clientes: clientes.map((c) => ({ id: c.id, nome: c.nome ?? "", telefone: c.telefone ?? "" })) });
}
