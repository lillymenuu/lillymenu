import { NextResponse } from "next/server";
import { obterCoordsPorCep } from "@/db/queries/cepLookup";
import { buscarTaxaAreaPorPonto } from "@/db/queries/taxasEntrega";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, msg: "Corpo invalido." }, { status: 400 });

  const { loja_id, cep } = body as Record<string, unknown>;
  const lojaId = Number(loja_id);
  const digitos = String(cep ?? "").replace(/\D/g, "");
  if (!lojaId || digitos.length !== 8) return NextResponse.json({ ok: false, msg: "Parametros invalidos." }, { status: 400 });

  const coords = await obterCoordsPorCep(digitos);
  if (!coords) return NextResponse.json({ ok: false, msg: "Nao foi possivel localizar o CEP." });

  const area = await buscarTaxaAreaPorPonto(lojaId, coords.lat, coords.lng);
  if (!area) return NextResponse.json({ ok: true, atendido: false, taxa: 0 });

  return NextResponse.json({ ok: true, atendido: true, taxa: area.taxa });
}
