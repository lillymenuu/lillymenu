import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { buscarCep } from "@/db/queries/cepLookup";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cep = searchParams.get("cep") ?? "";
  const resultado = await buscarCep(sessao.lojaId, cep);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    cep: resultado.cep,
    logradouro: resultado.logradouro,
    bairro: resultado.bairro,
    cidade: resultado.cidade,
    estado: resultado.estado,
    distancia_km: resultado.distanciaKm,
    taxa_entrega: resultado.taxaEntrega,
  });
}
