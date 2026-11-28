import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import {
  buscarClientesFiado,
  buscarClientesRecentes,
  buscarClientesUltimosPedidos,
} from "@/db/queries/fiado";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao)
    return NextResponse.json(
      { ok: false, msg: "Nao autenticado." },
      { status: 401 },
    );

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  /* recentes=1: ate 5 clientes, quem pediu por ultimo primeiro (modal de entrega). */
  const clientes =
    searchParams.get("recentes") === "1"
      ? await buscarClientesUltimosPedidos(sessao.lojaId, q, 5)
      : q.trim() === ""
        ? await buscarClientesRecentes(sessao.lojaId, 5)
        : await buscarClientesFiado(sessao.lojaId, q);

  return NextResponse.json({
    ok: true,
    clientes: clientes.map((c) => ({
      id: c.id,
      nome: c.nome ?? "",
      telefone: c.telefone ?? "",
    })),
  });
}
