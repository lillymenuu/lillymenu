import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getConfig } from "@/db/queries/config";
import { obterCoordsPorCep } from "@/db/queries/cepLookup";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const lojaCep = (await getConfig(sessao.lojaId, "loja_cep", "")).replace(/\D/g, "");
  if (lojaCep.length !== 8) return NextResponse.json({ ok: true, lat: null, lng: null });

  const coords = await obterCoordsPorCep(lojaCep);
  return NextResponse.json({ ok: true, lat: coords?.lat ?? null, lng: coords?.lng ?? null });
}
