import "server-only";
import { getConfig } from "@/db/queries/config";

/* Equivalente de public/api/geo_reverso.php: geolocalizacao reversa (lat/lng -> endereco) via Nominatim. */

const UF_POR_ESTADO: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

function normalizarEstado(estado: string): string {
  const chave = estado
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (UF_POR_ESTADO[chave]) return UF_POR_ESTADO[chave];
  if (estado.length === 2) return estado.toUpperCase();
  return "";
}

export type GeoReversoResultado =
  | { ok: false; msg: string }
  | { ok: true; rua: string; numero: string; bairro: string; cidade: string; estado: string; cep: string };

export async function geoReverso(lat: number, lng: number): Promise<GeoReversoResultado> {
  const ativo = (await getConfig(0, "saas_nominatim_ativo", "1")) === "1";
  if (!ativo) return { ok: false, msg: "Recurso de localizacao automatica desativado." };

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, msg: "Coordenadas invalidas." };
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&accept-language=pt-BR&zoom=18`;

  let dados: Record<string, unknown> | null = null;
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "LillyMenu/1.0 (contato@lillymenu.com)" }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return { ok: false, msg: "Nao foi possivel consultar o endereco no momento." };
    dados = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
  } catch {
    return { ok: false, msg: "Nao foi possivel consultar o endereco no momento." };
  }

  const endereco = dados?.address as Record<string, unknown> | undefined;
  if (!dados || !endereco) return { ok: false, msg: "Endereco nao encontrado para esta localizacao." };

  const rua = String(endereco.road ?? endereco.pedestrian ?? "");
  const bairro = String(endereco.suburb ?? endereco.neighbourhood ?? endereco.quarter ?? endereco.city_district ?? "");
  const cidade = String(endereco.city ?? endereco.town ?? endereco.village ?? endereco.municipality ?? "");
  const estado = normalizarEstado(String(endereco.state ?? ""));
  const cep = String(endereco.postcode ?? "").replace(/\D+/g, "");
  const numero = String(endereco.house_number ?? "");

  if (rua === "" && bairro === "" && cidade === "") {
    return { ok: false, msg: "Nao conseguimos identificar seu endereco. Preencha manualmente." };
  }

  return { ok: true, rua, numero, bairro, cidade, estado, cep };
}
