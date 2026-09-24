import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarTaxasDinamicas } from "@/db/queries/taxasEntrega";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const itens = await listarTaxasDinamicas(sessao.lojaId);
  return NextResponse.json({
    ok: true,
    itens: itens.map((t) => ({ id: t.id, distancia_km: t.distanciaKm, valor: t.valor, tipo: t.tipo, tempo_min: t.tempoMin, tempo_max: t.tempoMax })),
  });
}
