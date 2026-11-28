import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { buscarClientesFiado, buscarClientesUltimosPedidos } from "@/db/queries/fiado";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const busca = request.nextUrl.searchParams.get("busca") ?? "";
  /* recentes=1: ate 5 clientes, quem pediu por ultimo primeiro (modal "Selecionar cliente"). */
  const clientes =
    request.nextUrl.searchParams.get("recentes") === "1"
      ? await buscarClientesUltimosPedidos(sessao.lojaId, busca, 5)
      : await buscarClientesFiado(sessao.lojaId, busca);
  return NextResponse.json({ ok: true, clientes: clientes.map((c) => ({ id: c.id, nome: c.nome ?? "", telefone: c.telefone ?? "" })) });
}
