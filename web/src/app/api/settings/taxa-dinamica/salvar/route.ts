import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarTaxaDinamica } from "@/db/queries/taxasEntrega";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await salvarTaxaDinamica(sessao.lojaId, {
    id: body.id ? Number(body.id) : undefined,
    distanciaKm: body.distancia_km ?? 0,
    valor: body.valor ?? 0,
    tipo: body.tipo ? String(body.tipo) : undefined,
    tempoMin: body.tempo_min ?? null,
    tempoMax: body.tempo_max ?? null,
  });

  return NextResponse.json(resultado);
}
