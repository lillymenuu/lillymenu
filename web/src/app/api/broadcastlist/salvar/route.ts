import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarLista } from "@/db/queries/broadcastList";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  const nome = typeof body?.nome === "string" ? body.nome : "";
  const clientesIds = Array.isArray(body?.clientes) ? body.clientes.map((n: unknown) => Number(n)) : [];

  const resultado = await salvarLista(sessao.lojaId, id, nome, clientesIds);
  return NextResponse.json(resultado);
}
