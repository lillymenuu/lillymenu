import "server-only";
import { sql } from "drizzle-orm";
import { getConfigs } from "@/db/queries/config";
import { FUSO_PADRAO, fusoPorEstado, fusoValido } from "@/lib/fusos";

/*
 * Horarios gravados no banco (timestamp sem fuso, mode "string") ficam no relogio LOCAL DA LOJA —
 * igual ao date('Y-m-d H:i:s') do PHP depois de date_default_timezone_set(). Cada loja escolhe o
 * fuso em Configuracoes (configuracoes.fuso_horario; sem valor, segue o estado da loja); por isso "agora",
 * "hoje" e "daqui N dias" de dados da loja sempre passam pelas funcoes *Loja / *NoFuso abaixo.
 *
 * As versoes *Fortaleza continuam para o que e da PLATAFORMA (assinatura, cobranca, superadmin,
 * suporte, codigos de verificacao) — nao pertencem ao relogio de uma loja.
 */

export { FUSO_PADRAO };

function partesNoFuso(fuso: string, d = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const p: Record<string, string> = {};
  for (const parte of partes) p[parte.type] = parte.value;
  /* Alguns runtimes devolvem "24" para meia-noite com hour12:false. */
  if (p.hour === "24") p.hour = "00";
  return p;
}

/** "YYYY-MM-DD HH:MM:SS" no fuso informado. */
export function timestampNoFuso(fuso: string, d = new Date()): string {
  const p = partesNoFuso(fuso, d);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/** "YYYY-MM-DD" no fuso informado. */
export function dataNoFuso(fuso: string, d = new Date()): string {
  return timestampNoFuso(fuso, d).slice(0, 10);
}

/** Hoje + N dias, so a data (aritmetica pura em UTC-label, sem depender do fuso do servidor). */
export function adicionarDiasNoFuso(fuso: string, dias: number): string {
  const [y, m, d] = dataNoFuso(fuso).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + dias * 86_400_000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** Agora + N horas, timestamp completo (mesma aritmetica pura em UTC-label). */
export function adicionarHorasNoFuso(fuso: string, horas: number): string {
  const [dataParte, horaParte] = timestampNoFuso(fuso).split(" ");
  const [y, m, d] = dataParte.split("-").map(Number);
  const [hh, mm, ss] = horaParte.split(":").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, ss) + horas * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} ${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:${pad(dt.getUTCSeconds())}`;
}

/** Ano e mes atuais no fuso ("YYYY", "MM"). */
export function anoMesNoFuso(fuso: string): { ano: string; mes: string } {
  const p = partesNoFuso(fuso);
  return { ano: p.year, mes: p.month };
}

/** "agora" no relogio da loja em SQL (para comparar com colunas gravadas no horario local da loja). */
export function agoraSqlNoFuso(fuso: string) {
  return sql`(now() at time zone ${fuso})`;
}

/* ---------- fuso da loja (com cache curto: e lido em quase toda gravacao) ---------- */

const CACHE_MS = 60_000;
const cacheFuso = new Map<number, { fuso: string; expira: number }>();

export async function fusoLoja(lojaId: number): Promise<string> {
  const agora = Date.now();
  const c = cacheFuso.get(lojaId);
  if (c && c.expira > agora) return c.fuso;
  let fuso = FUSO_PADRAO;
  try {
    /* Sem fuso salvo: segue o estado da loja (cadastro grava loja_estado) — loja nova de Manaus
       ja nasce em America/Manaus sem precisar abrir Configuracoes. */
    const cfg = await getConfigs(lojaId, ["fuso_horario", "loja_estado"]);
    fuso = fusoValido(cfg.fuso_horario) ? cfg.fuso_horario : fusoPorEstado(cfg.loja_estado);
  } catch {
    /* banco instavel: usa o ultimo conhecido ou o padrao */
    if (c) return c.fuso;
  }
  cacheFuso.set(lojaId, { fuso, expira: agora + CACHE_MS });
  return fuso;
}

export function limparCacheFuso(lojaId: number) {
  cacheFuso.delete(lojaId);
}

export async function timestampLoja(lojaId: number): Promise<string> {
  return timestampNoFuso(await fusoLoja(lojaId));
}

export async function dataLoja(lojaId: number): Promise<string> {
  return dataNoFuso(await fusoLoja(lojaId));
}

export async function adicionarDiasLoja(lojaId: number, dias: number): Promise<string> {
  return adicionarDiasNoFuso(await fusoLoja(lojaId), dias);
}

export async function adicionarHorasLoja(lojaId: number, horas: number): Promise<string> {
  return adicionarHorasNoFuso(await fusoLoja(lojaId), horas);
}

/* ---------- relogio da plataforma (assinatura, cobranca, superadmin, suporte) ---------- */

export function timestampFortaleza(): string {
  return timestampNoFuso(FUSO_PADRAO);
}

export function dataFortaleza(): string {
  return dataNoFuso(FUSO_PADRAO);
}

export function adicionarDiasFortaleza(dias: number): string {
  return adicionarDiasNoFuso(FUSO_PADRAO, dias);
}

export function adicionarHorasFortaleza(horas: number): string {
  return adicionarHorasNoFuso(FUSO_PADRAO, horas);
}
