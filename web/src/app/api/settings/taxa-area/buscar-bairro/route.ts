import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getConfigs } from "@/db/queries/config";

/*
 * Busca o contorno real de um bairro/area no OpenStreetMap (Nominatim) pra
 * servir de ponto de partida no editor de poligono — em vez do admin ter que
 * clicar ponto a ponto "no olho", ele busca pelo nome e ja carrega o
 * contorno oficial (simplificado via polygon_threshold, senao viriam
 * centenas de vertices inuteis pro editor de arrastar-ponto).
 */

type NominatimResultado = {
  display_name?: string;
  name?: string;
  geojson?: { type: string; coordinates: unknown };
};

function extrairAnelPrincipal(geojson: NominatimResultado["geojson"]): number[][] | null {
  if (!geojson) return null;
  if (geojson.type === "Polygon") {
    const coords = geojson.coordinates as number[][][];
    return coords[0] ?? null;
  }
  if (geojson.type === "MultiPolygon") {
    const coords = geojson.coordinates as number[][][][];
    let maior: number[][] | null = null;
    for (const poly of coords) {
      const anel = poly[0];
      if (anel && (!maior || anel.length > maior.length)) maior = anel;
    }
    return maior;
  }
  return null;
}

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const termo = (searchParams.get("q") ?? "").trim();
  if (termo.length < 2) return NextResponse.json({ ok: false, msg: "Digite ao menos 2 letras." });

  const cfg = await getConfigs(sessao.lojaId, ["loja_cidade", "loja_estado"]);
  const query = [termo, cfg.loja_cidade, cfg.loja_estado, "Brasil"].filter(Boolean).join(", ");
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&polygon_geojson=1&polygon_threshold=0.0006&addressdetails=1&limit=5&countrycodes=br`;

  let dados: NominatimResultado[] = [];
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "LillyMenu/1.0 (contato@lillymenu.com)" }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return NextResponse.json({ ok: false, msg: "Nao foi possivel buscar o bairro agora." });
    dados = (await resp.json().catch(() => [])) as NominatimResultado[];
  } catch {
    return NextResponse.json({ ok: false, msg: "Nao foi possivel buscar o bairro agora." });
  }

  const resultados = dados
    .map((d) => {
      const anel = extrairAnelPrincipal(d.geojson);
      if (!anel || anel.length < 3) return null;
      return {
        nome: d.name || termo,
        descricao: d.display_name || "",
        poligono: anel.map(([lng, lat]) => ({ lat, lng })),
      };
    })
    .filter((r): r is { nome: string; descricao: string; poligono: { lat: number; lng: number }[] } => r !== null);

  if (resultados.length === 0) return NextResponse.json({ ok: true, resultados: [], msg: "Nenhum contorno encontrado pra esse nome." });

  return NextResponse.json({ ok: true, resultados });
}
