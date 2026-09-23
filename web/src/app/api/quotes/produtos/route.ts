import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { produtosParaOrcamento } from "@/db/queries/orcamentos";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const produtos = await produtosParaOrcamento(sessao.lojaId);
  return NextResponse.json({ ok: true, produtos });
}
