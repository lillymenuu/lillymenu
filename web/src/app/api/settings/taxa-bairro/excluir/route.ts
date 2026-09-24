import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { excluirTaxaBairro } from "@/db/queries/taxasEntrega";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await excluirTaxaBairro(sessao.lojaId, Number(body.id ?? 0));
  return NextResponse.json(resultado);
}
