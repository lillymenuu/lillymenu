import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { taxasBairro, taxasDinamicas } from "@/db/schema";
import { getConfig } from "@/db/queries/config";
import { buscarTaxaAreaPorPonto } from "@/db/queries/taxasEntrega";

/*
 * Equivalente de admin/api/cep_lookup.php (usado via ponte de sessao por
 * admin/api/v1/pdv_cep_lookup.php): geocodifica um CEP, calcula a distancia
 * ate a loja (rota real via OSRM, com fallback pra linha reta/Haversine) e a
 * taxa de entrega (por bairro ou dinamica por distancia) pro PDV.
 */

type Coords = { lat: number; lng: number; logradouro: string; bairro: string; cidade: string; estado: string };

async function fetchJson(url: string, timeoutMs = 6000, debugOut?: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (debugOut) debugOut.status = resp.status;
    if (!resp.ok) return null;
    const data = await resp.json().catch((e) => {
      if (debugOut) debugOut.parseError = String(e);
      return null;
    });
    return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch (e) {
    if (debugOut) debugOut.fetchError = String(e);
    return null;
  }
}

async function obterCoordsBrasilApi(cep: string): Promise<Coords | null> {
  const resp = await fetchJson(`https://brasilapi.com.br/api/cep/v2/${cep}`);
  const location = (resp?.location as Record<string, unknown> | undefined)?.coordinates as Record<string, unknown> | undefined;
  if (!resp || !location) return null;
  const lat = location.latitude !== undefined ? Number(location.latitude) : null;
  const lng = location.longitude !== undefined ? Number(location.longitude) : null;
  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, logradouro: String(resp.street ?? ""), bairro: String(resp.neighborhood ?? ""), cidade: String(resp.city ?? ""), estado: String(resp.state ?? "") };
}

async function obterCoordsAwesomeApi(cep: string): Promise<Coords | null> {
  const resp = await fetchJson(`https://cep.awesomeapi.com.br/json/${cep}`);
  if (!resp) return null;
  const lat = resp.lat !== undefined ? Number(resp.lat) : null;
  const lng = resp.lng !== undefined ? Number(resp.lng) : null;
  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, logradouro: String(resp.address ?? ""), bairro: String(resp.district ?? ""), cidade: String(resp.city ?? ""), estado: String(resp.state ?? "") };
}

/* Nominatim (mesmo provedor/User-Agent usado por geoReverso.ts) geocodificando
 * por CEP (busca estruturada por postalcode). Mais confiavel que AwesomeApi a
 * partir da rede da Vercel — AwesomeApi devolve 429 (rate limit) pro IP
 * compartilhado da Vercel, o que fazia a taxa por area nunca bater em
 * producao mesmo com o CEP certo. */
async function obterCoordsNominatim(cep: string): Promise<Coords | null> {
  const cepFormatado = `${cep.slice(0, 5)}-${cep.slice(5)}`;
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(cepFormatado)}&country=Brazil&format=jsonv2&addressdetails=1&limit=1`;
  let resp: Record<string, unknown> | null = null;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "LillyMenu/1.0 (contato@lillymenu.com)" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    resp = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) ?? null : null;
  } catch {
    return null;
  }
  if (!resp) return null;
  const lat = resp.lat !== undefined ? Number(resp.lat) : null;
  const lng = resp.lon !== undefined ? Number(resp.lon) : null;
  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const endereco = resp.address as Record<string, unknown> | undefined;
  return {
    lat,
    lng,
    logradouro: String(endereco?.road ?? ""),
    bairro: String(endereco?.suburb ?? endereco?.neighbourhood ?? ""),
    cidade: String(endereco?.municipality ?? endereco?.city ?? ""),
    estado: String(endereco?.state ?? ""),
  };
}

export async function obterCoordsPorCep(cep: string): Promise<Coords | null> {
  const coords = await obterCoordsBrasilApi(cep);
  if (coords) return coords;
  return obterCoordsAwesomeApi(cep);
}

/*
 * Taxa por area/poligono e muito mais sensivel a erro de geocodificacao do
 * que distancia (um ponto alguns metros fora do poligono ja da "nao
 * atendido"). As fontes gratuitas de CEP->coordenada discordam bastante
 * entre si e, pra alguns CEPs, uma delas acerta cidade/bairro mas devolve
 * lat/lng a varios km de distancia (BrasilAPI) ou e bloqueada (429) pelo IP
 * compartilhado da Vercel (AwesomeApi). Por isso tentamos as tres fontes em
 * paralelo e aceitamos a primeira coordenada que cair dentro de algum
 * poligono cadastrado, em vez de confiar na ordem de fallback usada pra
 * distancia/bairro.
 */
export async function buscarTaxaAreaPorCep(lojaId: number, cep: string): Promise<{ atendido: boolean; taxa: number } | null> {
  const [brasilApi, nominatim, awesomeApi] = await Promise.all([obterCoordsBrasilApi(cep), obterCoordsNominatim(cep), obterCoordsAwesomeApi(cep)]);
  for (const coords of [brasilApi, nominatim, awesomeApi]) {
    if (!coords) continue;
    const area = await buscarTaxaAreaPorPonto(lojaId, coords.lat, coords.lng);
    if (area) return { atendido: true, taxa: area.taxa };
  }
  if (!brasilApi && !nominatim && !awesomeApi) return null;
  return { atendido: false, taxa: 0 };
}

function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const raio = 6371;
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return raio * c;
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

async function calcularDistanciaRotaKm(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false&alternatives=false`;
  const resp = await fetchJson(url);
  const routes = resp?.routes as { distance?: number }[] | undefined;
  const metros = routes?.[0]?.distance;
  if (!metros || metros <= 0) return null;
  return metros / 1000;
}

async function calcularTaxaDinamica(distancia: number, lojaId: number, porKm: boolean): Promise<number> {
  const regras = await db.select({ distanciaKm: taxasDinamicas.distancia_km, valor: taxasDinamicas.valor, tipo: taxasDinamicas.tipo }).from(taxasDinamicas).where(eq(taxasDinamicas.loja_id, lojaId)).orderBy(taxasDinamicas.distancia_km);
  if (regras.length === 0 || distancia <= 0) return 0;

  const regra = regras.find((r) => distancia <= r.distanciaKm) ?? regras[regras.length - 1];
  let valor = Number(regra?.valor ?? 0);
  if (porKm && regra?.tipo === "por_km") valor = valor * distancia;
  return valor < 0 ? 0 : valor;
}

export type ResultadoCepLookup = { ok: true; cep: string; logradouro: string; bairro: string; cidade: string; estado: string; distanciaKm: number; taxaEntrega: number } | { ok: false; msg: string };

export async function buscarCep(lojaId: number, cepInput: string): Promise<ResultadoCepLookup> {
  const cep = cepInput.replace(/\D/g, "");
  if (cep.length !== 8) return { ok: false, msg: "CEP invalido." };

  const lojaCep = (await getConfig(lojaId, "loja_cep", "")).replace(/\D/g, "");
  if (lojaCep.length !== 8) return { ok: false, msg: "CEP da loja nao configurado." };

  const [origem, destino] = await Promise.all([obterCoordsPorCep(lojaCep), obterCoordsPorCep(cep)]);
  if (!origem || !destino) return { ok: false, msg: "Nao foi possivel localizar o CEP." };

  if (!destino.bairro || !destino.cidade || !destino.logradouro) {
    const via = await fetchJson(`https://viacep.com.br/ws/${cep}/json/`);
    if (via && !via.erro) {
      if (!destino.logradouro && via.logradouro) destino.logradouro = String(via.logradouro);
      if (!destino.bairro && via.bairro) destino.bairro = String(via.bairro);
      if (!destino.cidade && via.localidade) destino.cidade = String(via.localidade);
      if (!destino.estado && via.uf) destino.estado = String(via.uf);
    }
  }

  const distanciaRotaBruta = await calcularDistanciaRotaKm(origem.lat, origem.lng, destino.lat, destino.lng);
  const fatorCorrecaoRota = 2.0;
  const distanciaRota = distanciaRotaBruta !== null ? distanciaRotaBruta * fatorCorrecaoRota : null;
  const distancia = distanciaRota ?? calcularDistanciaKm(origem.lat, origem.lng, destino.lat, destino.lng);

  let taxaEntrega = 0;
  const tipoTaxa = await getConfig(lojaId, "taxa_entrega_tipo", "fixa");
  if (tipoTaxa === "bairro" && destino.bairro) {
    const lista = await db.select({ bairro: taxasBairro.bairro, taxa: taxasBairro.taxa }).from(taxasBairro).where(eq(taxasBairro.loja_id, lojaId));
    const bairroAlvo = normalizarTexto(destino.bairro);
    const encontrada = lista.find((r) => normalizarTexto(r.bairro ?? "") === bairroAlvo);
    taxaEntrega = encontrada ? Number(encontrada.taxa) : 0;
  } else if (tipoTaxa === "dinamica") {
    taxaEntrega = await calcularTaxaDinamica(distancia, lojaId, false);
  } else if (tipoTaxa === "area") {
    const area = await buscarTaxaAreaPorCep(lojaId, cep);
    taxaEntrega = area?.atendido ? area.taxa : 0;
  }

  return {
    ok: true,
    cep: `${cep.slice(0, 5)}-${cep.slice(5)}`,
    logradouro: destino.logradouro,
    bairro: destino.bairro,
    cidade: destino.cidade,
    estado: destino.estado,
    distanciaKm: Math.round(distancia * 100) / 100,
    taxaEntrega,
  };
}
