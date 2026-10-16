import "server-only";
import { clienteDetalhe } from "@/db/queries/clientesAdmin";
import { obterCoordsPorCep } from "@/db/queries/cepLookup";

export type ClienteMapaResultado = { ok: true; lat: number; lng: number; endereco: string } | { ok: false; msg: string };

type ClienteEnderecoCampos = {
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  complemento: string | null;
  endereco: string | null;
};

function montarEnderecoTexto(c: ClienteEnderecoCampos): string {
  const rua = (c.rua ?? "").trim();
  const numero = (c.numero ?? "").trim();
  const bairro = (c.bairro ?? "").trim();
  const cidade = (c.cidade ?? "").trim();
  const estado = (c.estado ?? "").trim();
  const cep = (c.cep ?? "").trim();
  const complemento = (c.complemento ?? "").trim();

  const partes: string[] = [];
  if (rua) partes.push(numero ? `${rua}, ${numero}` : rua);
  if (complemento) partes.push(complemento);
  if (bairro) partes.push(bairro);
  const cidadeEstado = [cidade, estado].filter(Boolean).join(" - ");
  if (cidadeEstado) partes.push(cidadeEstado);
  if (cep) partes.push(cep);

  const texto = partes.join(", ");
  return texto !== "" ? texto : (c.endereco ?? "").trim();
}

type Ponto = { lat: number; lng: number };

async function buscarNominatim(url: string): Promise<Ponto | null> {
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "LillyMenu/1.0 (contato@lillymenu.com)" }, signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const data = (await resp.json().catch(() => null)) as { lat?: string; lon?: string }[] | null;
    const item = data?.[0];
    const lat = item?.lat !== undefined ? Number(item.lat) : null;
    const lng = item?.lon !== undefined ? Number(item.lon) : null;
    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/* Busca estruturada (rua + numero + cidade/estado/cep) — muito mais precisa que geocodificar so
   pelo CEP, ja que no Brasil um CEP costuma cobrir um trecho inteiro de rua, nao um numero exato. */
async function geocodarEnderecoEstruturado(c: ClienteEnderecoCampos): Promise<Ponto | null> {
  const rua = (c.rua ?? "").trim();
  const cidade = (c.cidade ?? "").trim();
  if (!rua || !cidade) return null;

  const numero = (c.numero ?? "").trim();
  const estado = (c.estado ?? "").trim();
  const cep = (c.cep ?? "").replace(/\D/g, "");

  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    country: "Brazil",
    street: numero ? `${rua}, ${numero}` : rua,
    city: cidade,
  });
  if (estado) params.set("state", estado);
  if (cep.length === 8) params.set("postalcode", `${cep.slice(0, 5)}-${cep.slice(5)}`);

  return buscarNominatim(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
}

/* Busca livre (texto corrido) — fallback quando a busca estruturada nao acha nada (ex.: rua nova
   demais pro OSM ter o numero exato, mas o texto completo ainda bate com algo). */
async function geocodarEnderecoLivre(c: ClienteEnderecoCampos): Promise<Ponto | null> {
  const partes = [c.rua, c.numero, c.bairro, c.cidade, c.estado].map((v) => (v ?? "").trim()).filter(Boolean);
  if (partes.length === 0) return null;

  const query = `${partes.join(", ")}, Brasil`;
  return buscarNominatim(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1&countrycodes=br`);
}

export async function clienteMapa(lojaId: number, clienteId: number): Promise<ClienteMapaResultado> {
  const resultado = await clienteDetalhe(lojaId, clienteId);
  if (!resultado.ok) return resultado;

  const c = resultado.cliente;
  const endereco = montarEnderecoTexto(c);
  if (!endereco) return { ok: false, msg: "Cliente sem endereço cadastrado." };

  const estruturado = await geocodarEnderecoEstruturado(c);
  if (estruturado) return { ok: true, ...estruturado, endereco };

  const livre = await geocodarEnderecoLivre(c);
  if (livre) return { ok: true, ...livre, endereco };

  /* Ultimo recurso: centroide do CEP (BrasilAPI/AwesomeApi) — menos preciso que um endereco
     completo, pode cair bem longe do numero real, mas e melhor que nao mostrar nada. */
  const cep = (c.cep ?? "").replace(/\D/g, "");
  if (cep.length === 8) {
    const coords = await obterCoordsPorCep(cep);
    if (coords) return { ok: true, lat: coords.lat, lng: coords.lng, endereco };
  }

  return { ok: false, msg: "Não foi possível localizar o endereço no mapa." };
}
