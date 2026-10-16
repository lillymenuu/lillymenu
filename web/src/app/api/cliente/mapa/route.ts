import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { clienteMapa } from "@/db/queries/clienteMapa";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const id = Number(params.get("id") ?? 0);

  const resultado = await clienteMapa(sessao.lojaId, id);
  return NextResponse.json(resultado);
}
