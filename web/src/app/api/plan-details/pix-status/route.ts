import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { consultarStatusPix } from "@/db/queries/pagamentoPix";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const cobrancaId = Number(request.nextUrl.searchParams.get("cobranca_id") ?? "0");
  const resultado = await consultarStatusPix(sessao.lojaId, cobrancaId);
  return NextResponse.json(resultado);
}
