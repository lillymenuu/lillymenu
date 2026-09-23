import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { definirLojaAberta } from "@/db/queries/lojaStatus";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const aberta = body?.aberta === undefined ? true : Boolean(body.aberta);

  await definirLojaAberta(sessao.lojaId, aberta);
  return NextResponse.json({ ok: true, aberta });
}
