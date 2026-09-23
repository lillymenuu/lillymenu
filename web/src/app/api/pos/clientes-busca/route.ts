import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { buscarClientesFiado } from "@/db/queries/fiado";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const clientes = await buscarClientesFiado(sessao.lojaId, q);

  return NextResponse.json({
    ok: true,
    clientes: clientes.map((c) => ({ id: c.id, nome: c.nome ?? "", telefone: c.telefone ?? "" })),
  });
}
