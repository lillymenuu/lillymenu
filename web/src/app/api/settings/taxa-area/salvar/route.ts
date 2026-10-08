import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarTaxaArea } from "@/db/queries/taxasEntrega";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const poligono = Array.isArray(body.poligono)
    ? body.poligono.map((p: { lat?: unknown; lng?: unknown }) => ({ lat: Number(p?.lat), lng: Number(p?.lng) }))
    : [];

  const resultado = await salvarTaxaArea(sessao.lojaId, {
    id: body.id ? Number(body.id) : undefined,
    nome: String(body.nome ?? ""),
    taxa: body.taxa ?? 0,
    tempoMin: body.tempo_min ?? null,
    tempoMax: body.tempo_max ?? null,
    poligono,
  });

  return NextResponse.json(resultado);
}
