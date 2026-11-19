/*
 * Fusos horarios do Brasil oferecidos em Configuracoes > Fuso horario da loja. Usa o fuso IANA da
 * regiao (e nao so o deslocamento): se o horario de verao voltar, cada regiao segue a regra dela.
 * Compartilhado entre servidor (validacao, tempo.ts) e cliente (select do modal).
 */

export const FUSO_PADRAO = "America/Fortaleza";

export type FusoOpcao = { valor: string; rotulo: string; estados: string[] };

export const FUSOS_BRASIL: FusoOpcao[] = [
  { valor: "America/Sao_Paulo", rotulo: "Brasília", estados: ["SP", "RJ", "MG", "ES", "PR", "SC", "RS", "GO", "DF"] },
  { valor: "America/Fortaleza", rotulo: "Fortaleza", estados: ["CE", "RN", "PB", "PE", "PI", "MA"] },
  { valor: "America/Bahia", rotulo: "Salvador", estados: ["BA"] },
  { valor: "America/Maceio", rotulo: "Maceió", estados: ["AL", "SE"] },
  { valor: "America/Belem", rotulo: "Belém", estados: ["PA", "AP"] },
  { valor: "America/Araguaina", rotulo: "Palmas", estados: ["TO"] },
  { valor: "America/Noronha", rotulo: "Fernando de Noronha", estados: [] },
  { valor: "America/Manaus", rotulo: "Manaus", estados: ["AM"] },
  { valor: "America/Cuiaba", rotulo: "Cuiabá", estados: ["MT"] },
  { valor: "America/Campo_Grande", rotulo: "Campo Grande", estados: ["MS"] },
  { valor: "America/Porto_Velho", rotulo: "Porto Velho", estados: ["RO"] },
  { valor: "America/Boa_Vista", rotulo: "Boa Vista", estados: ["RR"] },
  { valor: "America/Rio_Branco", rotulo: "Rio Branco", estados: ["AC"] },
];

export function fusoValido(fuso: string | null | undefined): fuso is string {
  return !!fuso && FUSOS_BRASIL.some((f) => f.valor === fuso);
}

const NOMES_ESTADOS: Record<string, string> = {
  ACRE: "AC", ALAGOAS: "AL", AMAPA: "AP", AMAZONAS: "AM", BAHIA: "BA", CEARA: "CE", "DISTRITO FEDERAL": "DF",
  "ESPIRITO SANTO": "ES", GOIAS: "GO", MARANHAO: "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS",
  "MINAS GERAIS": "MG", PARA: "PA", PARAIBA: "PB", PARANA: "PR", PERNAMBUCO: "PE", PIAUI: "PI",
  "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS", RONDONIA: "RO",
  RORAIMA: "RR", "SANTA CATARINA": "SC", "SAO PAULO": "SP", SERGIPE: "SE", TOCANTINS: "TO",
};

/** Fuso pela UF ("SP") ou nome do estado ("São Paulo"); padrao quando nao reconhece. */
export function fusoPorEstado(estado: string | null | undefined): string {
  const limpo = (estado ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase();
  const uf = limpo.length === 2 ? limpo : NOMES_ESTADOS[limpo];
  return FUSOS_BRASIL.find((f) => uf && f.estados.includes(uf))?.valor ?? FUSO_PADRAO;
}

/** Deslocamento atual do fuso, ex.: "UTC−3" (calculado na hora, segue horario de verao se houver). */
export function deslocamentoFuso(fuso: string, d = new Date()): string {
  const nome = new Intl.DateTimeFormat("en-US", { timeZone: fuso, timeZoneName: "shortOffset" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = /GMT([+-]\d+)?/.exec(nome ?? "");
  const h = m?.[1] ? Number(m[1]) : 0;
  return h === 0 ? "UTC" : `UTC${h < 0 ? "−" : "+"}${Math.abs(h)}`;
}

/** "HH:MM" agora no fuso. */
export function horaAgoraNoFuso(fuso: string, d = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}
