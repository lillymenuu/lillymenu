import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { clienteDetalhe } from "@/db/queries/clientesAdmin";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const id = Number(request.nextUrl.searchParams.get("id") ?? 0);
  const resultado = await clienteDetalhe(sessao.lojaId, id);
  return NextResponse.json(resultado);
}
