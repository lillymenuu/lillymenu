import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getConfigs } from "@/db/queries/config";
import { obterCoordsPorCep } from "@/db/queries/cepLookup";

/*
 * Centro inicial do editor de area. Geocodificar a cidade cadastrada
 * (Informacoes da loja) e bem mais confiavel que geocodificar o CEP exato —
 * nesta mesma sessao varios CEPs reais falharam nas APIs gratuitas (coordenada
 * errada ou CEP nao indexado), enquanto cidade quase sempre resolve. Por
 * isso a cidade e a fonte principal (com zoom mais aberto, pra enxergar a
 * cidade toda); o CEP so refina o ponto (zoom mais fechado) quando a cidade
 * nao estiver cadastrada.
 */
async function obterCoordsCidade(cidade: string, estado: string): Promise<{ lat: number; lng: number } | null> {
  const query = [cidade, estado, "Brasil"].filter(Boolean).join(", ");
  if (!cidade.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1&countrycodes=br`;
    const resp = await fetch(url, { headers: { "User-Agent": "LillyMenu/1.0 (contato@lillymenu.com)" }, signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const data = await resp.json().catch(() => null);
    const item = Array.isArray(data) ? data[0] : null;
    if (!item) return null;
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const cfg = await getConfigs(sessao.lojaId, ["loja_cidade", "loja_estado", "loja_cep"]);

  const porCidade = await obterCoordsCidade(cfg.loja_cidade, cfg.loja_estado);
  if (porCidade) return NextResponse.json({ ok: true, lat: porCidade.lat, lng: porCidade.lng, zoom: 12 });

  const lojaCep = (cfg.loja_cep || "").replace(/\D/g, "");
  if (lojaCep.length === 8) {
    const coords = await obterCoordsPorCep(lojaCep);
    if (coords) return NextResponse.json({ ok: true, lat: coords.lat, lng: coords.lng, zoom: 14 });
  }

  return NextResponse.json({ ok: true, lat: null, lng: null, zoom: 12 });
}
