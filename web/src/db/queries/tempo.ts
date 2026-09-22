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

/** "agora" na loja + N dias, so a data (aritmetica pura em UTC-label, sem depender do fuso do servidor). */
export function adicionarDiasFortaleza(dias: number): string {
  const [y, m, d] = dataFortaleza().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + dias * 86_400_000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** "agora" na loja + N horas, timestamp completo (mesma aritmetica pura em UTC-label). */
export function adicionarHorasFortaleza(horas: number): string {
  const [dataParte, horaParte] = timestampFortaleza().split(" ");
  const [y, m, d] = dataParte.split("-").map(Number);
  const [hh, mm, ss] = horaParte.split(":").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, ss) + horas * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} ${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:${pad(dt.getUTCSeconds())}`;
}
