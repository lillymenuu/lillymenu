import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheLista } from "@/db/queries/broadcastList";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { id } = await params;
  const resultado = await detalheLista(sessao.lojaId, Number(id));
  return NextResponse.json(resultado);
}
