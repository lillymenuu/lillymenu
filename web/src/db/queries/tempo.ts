import "server-only";

/*
 * Timestamp "agora" no fuso da loja, no formato que o Postgres timestamp
 * (mode: "string") espera. Equivalente ao date('Y-m-d H:i:s') do PHP depois
 * de date_default_timezone_set('America/Fortaleza') — calculado explicitamente
 * no fuso da loja em vez de usar NOW() do banco (evita drift de fuso do servidor).
 */
const FUSO_LOJA = "America/Fortaleza";

export function timestampFortaleza(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_LOJA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const p: Record<string, string> = {};
  for (const parte of partes) p[parte.type] = parte.value;
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

export function dataFortaleza(): string {
  return timestampFortaleza().slice(0, 10);
}
