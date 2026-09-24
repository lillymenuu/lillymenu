import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarTaxasBairro } from "@/db/queries/taxasEntrega";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const itens = await listarTaxasBairro(sessao.lojaId);
  return NextResponse.json({
    ok: true,
    itens: itens.map((t) => ({ id: t.id, bairro: t.bairro, taxa: t.taxa, tempo_min: t.tempoMin, tempo_max: t.tempoMax })),
  });
}
