import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarTaxaServico } from "@/db/queries/modoGarcom";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ativa = Boolean(body?.ativa);
  const pct = Number(body?.pct ?? 0);

  const resultado = await salvarTaxaServico(sessao.lojaId, ativa, pct);
  return NextResponse.json(resultado);
}
