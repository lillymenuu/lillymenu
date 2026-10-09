import { NextResponse } from "next/server";
import { buscarTaxaAreaPorCep } from "@/db/queries/cepLookup";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, msg: "Corpo invalido." }, { status: 400 });

  const { loja_id, cep } = body as Record<string, unknown>;
  const lojaId = Number(loja_id);
  const digitos = String(cep ?? "").replace(/\D/g, "");
  if (!lojaId || digitos.length !== 8) return NextResponse.json({ ok: false, msg: "Parametros invalidos." }, { status: 400 });

  const area = await buscarTaxaAreaPorCep(lojaId, digitos);
  if (!area) return NextResponse.json({ ok: false, msg: "Nao foi possivel localizar o CEP." });

  return NextResponse.json({ ok: true, atendido: area.atendido, taxa: area.taxa });
}
