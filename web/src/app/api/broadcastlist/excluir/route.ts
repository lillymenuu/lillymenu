import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { excluirLista } from "@/db/queries/broadcastList";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);

  const resultado = await excluirLista(sessao.lojaId, id);
  return NextResponse.json(resultado);
}
