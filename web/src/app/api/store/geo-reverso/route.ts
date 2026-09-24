import { NextResponse } from "next/server";
import { geoReverso } from "@/db/queries/geoReverso";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  if (!url.searchParams.get("lat") || !url.searchParams.get("lng") || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  const resultado = await geoReverso(lat, lng);
  return NextResponse.json(resultado);
}
