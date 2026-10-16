import "server-only";
import { clienteDetalhe } from "@/db/queries/clientesAdmin";
import { obterCoordsPorCep } from "@/db/queries/cepLookup";

export type ClienteMapaResultado = { ok: true; lat: number; lng: number; endereco: string } | { ok: false; msg: string };

function montarEnderecoTexto(c: {
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  complemento: string | null;
  endereco: string | null;
}): string {
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

/* Sem lat/lng salvos pro cliente — geocodifica a partir do CEP (mesma fonte usada pro PDV)
   e, se nao der (sem CEP ou CEP sem coordenada), cai pra uma busca livre no Nominatim com
   rua/bairro/cidade/estado. */
export async function clienteMapa(lojaId: number, clienteId: number): Promise<ClienteMapaResultado> {
  const resultado = await clienteDetalhe(lojaId, clienteId);
  if (!resultado.ok) return resultado;

  const c = resultado.cliente;
  const endereco = montarEnderecoTexto(c);
  if (!endereco) return { ok: false, msg: "Cliente sem endereço cadastrado." };

  const cep = (c.cep ?? "").replace(/\D/g, "");
  if (cep.length === 8) {
    const coords = await obterCoordsPorCep(cep);
    if (coords) return { ok: true, lat: coords.lat, lng: coords.lng, endereco };
  }

  const partesBusca = [c.rua, c.numero, c.bairro, c.cidade, c.estado].map((v) => (v ?? "").trim()).filter(Boolean);
  if (partesBusca.length === 0) return { ok: false, msg: "Não foi possível localizar o endereço no mapa." };

  try {
    const query = `${partesBusca.join(", ")}, Brasil`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1&countrycodes=br`;
    const resp = await fetch(url, { headers: { "User-Agent": "LillyMenu/1.0 (contato@lillymenu.com)" }, signal: AbortSignal.timeout(6000) });
    if (resp.ok) {
      const data = (await resp.json().catch(() => null)) as { lat?: string; lon?: string }[] | null;
      const item = data?.[0];
      const lat = item?.lat !== undefined ? Number(item.lat) : null;
      const lng = item?.lon !== undefined ? Number(item.lon) : null;
      if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) {
        return { ok: true, lat, lng, endereco };
      }
    }
  } catch {
    /* cai no retorno de erro abaixo */
  }

  return { ok: false, msg: "Não foi possível localizar o endereço no mapa." };
}
