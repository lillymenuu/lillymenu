import { NextResponse } from "next/server";
import { storePhpFetch, StoreApiError } from "@/lib/store/api";

type GeoReversoResposta = {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  try {
    const data = await storePhpFetch<(GeoReversoResposta & { ok: true }) | { ok: false; msg: string }>(
      `/public/api/geo_reverso.php?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    const msg = e instanceof StoreApiError ? e.message : "Erro ao falar com a loja.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
