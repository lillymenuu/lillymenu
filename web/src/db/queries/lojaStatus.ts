import "server-only";
import { and, lte, gte, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pausasProgramadas, configuracoes } from "@/db/schema";
import { getConfigs } from "@/db/queries/config";

/* Equivalente de admin/api/v1/loja_status.php (abre/fecha a loja manualmente). */
export async function definirLojaAberta(lojaId: number, aberta: boolean): Promise<void> {
  const valor = aberta ? "0" : "1";
  await db
    .insert(configuracoes)
    .values({ loja_id: lojaId, chave: "loja_force_fechada", valor })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
}

/* Equivalente de admin/helpers/whatsapp.php: estaAberto(). */
export async function estaAberto(lojaId: number): Promise<boolean> {
  const cfg = await getConfigs(lojaId, [
    "loja_force_fechada",
    "fuso_horario",
    "horarios_semana",
    "horario_abertura",
    "horario_fechamento",
    "dias_funcionamento",
  ]);

  if (cfg.loja_force_fechada === "1") return false;

  const fuso = cfg.fuso_horario || "America/Fortaleza";
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hora = `${partes.find((p) => p.type === "hour")?.value ?? "00"}:${partes.find((p) => p.type === "minute")?.value ?? "00"}`;
  const dataHoje = new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date());

  /* pausa programada ativa (sobrepoe horario de funcionamento) */
  const agoraStr = `${dataHoje} ${hora}:00`;
  const pausa = await db
    .select({ id: pausasProgramadas.id })
    .from(pausasProgramadas)
    .where(
      and(
        eq(pausasProgramadas.loja_id, lojaId),
        lte(sql`concat(${pausasProgramadas.data_inicio}, ' ', ${pausasProgramadas.hora_inicio})`, agoraStr),
        gte(sql`concat(${pausasProgramadas.data_fim}, ' ', ${pausasProgramadas.hora_fim})`, agoraStr)
      )
    )
    .limit(1);
  if (pausa.length > 0) return false;

  /* PHP date('N'): 1=Seg...7=Dom. JS getDay(): 0=Dom...6=Sab. Config dias_semana_full: 1=Dom...7=Sab. */
  const diaJs = new Date(`${dataHoje}T00:00:00`).getDay(); // 0=Dom
  const configDia = diaJs + 1; // 1=Dom...7=Sab

  if (cfg.horarios_semana) {
    try {
      const horarios = JSON.parse(cfg.horarios_semana) as Record<string, { inicio?: string; fim?: string } | undefined>;
      const horarioDia = horarios[String(configDia)];
      if (horarioDia !== undefined) {
        if (!horarioDia?.inicio || !horarioDia?.fim) return false; // dia fechado
        return hora >= horarioDia.inicio && hora <= horarioDia.fim;
      }
    } catch {
      /* JSON invalido: cai no fallback abaixo */
    }
  }

  if (!cfg.horario_abertura || !cfg.horario_fechamento) return true; // sem horario -> assume aberto

  if (cfg.dias_funcionamento) {
    const diasArr = cfg.dias_funcionamento
      .split(",")
      .map((d) => parseInt(d, 10))
      .filter((d) => !Number.isNaN(d));
    if (diasArr.length > 0 && !diasArr.includes(configDia)) return false;
  }

  return hora >= cfg.horario_abertura && hora <= cfg.horario_fechamento;
}
