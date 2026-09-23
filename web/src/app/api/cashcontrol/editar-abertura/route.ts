import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { editarAberturaCaixa } from "@/db/queries/caixaDetalhe";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const caixaId = Number(body?.caixa_id ?? 0);
  const abertoEm = typeof body?.aberto_em === "string" ? body.aberto_em : "";

  const resultado = await editarAberturaCaixa(sessao.lojaId, caixaId, abertoEm);
  return NextResponse.json(resultado);
}
