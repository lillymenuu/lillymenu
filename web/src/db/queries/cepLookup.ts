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

async function fetchJson(url: string, timeoutMs = 6000): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!resp.ok) return null;
    const data = await resp.json().catch(() => null);
    return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch {
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

export async function obterCoordsPorCep(cep: string): Promise<Coords | null> {
  const coords = await obterCoordsBrasilApi(cep);
  if (coords) return coords;
  return obterCoordsAwesomeApi(cep);
}

/*
 * Taxa por area/poligono e muito mais sensivel a erro de geocodificacao do
 * que distancia (um ponto alguns metros fora do poligono ja da "nao
 * atendido"). BrasilAPI e AwesomeAPI geocodificam o mesmo CEP de formas
 * diferentes e, pra alguns CEPs, uma das duas devolve coordenada claramente
 * errada (ex.: BrasilAPI pode acertar cidade/bairro mas devolver lat/lng a
 * varios km de distancia). Por isso aqui tentamos as duas fontes e aceitamos
 * a primeira que caia dentro de algum poligono cadastrado, em vez de confiar
 * so na ordem de fallback usada pra distancia/bairro.
 */
export async function buscarTaxaAreaPorCep(lojaId: number, cep: string): Promise<{ atendido: boolean; taxa: number; debug?: unknown } | null> {
  const [brasilApi, awesomeApi] = await Promise.all([obterCoordsBrasilApi(cep), obterCoordsAwesomeApi(cep)]);
  for (const coords of [brasilApi, awesomeApi]) {
    if (!coords) continue;
    const area = await buscarTaxaAreaPorPonto(lojaId, coords.lat, coords.lng);
    if (area) return { atendido: true, taxa: area.taxa, debug: { brasilApi, awesomeApi } };
  }
  if (!brasilApi && !awesomeApi) return null;
  return { atendido: false, taxa: 0, debug: { brasilApi, awesomeApi } };
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
