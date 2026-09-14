export type AgendamentoConfig = {
  ativo: boolean;
  min_tipo: string;
  min_valor: number;
  max_tipo: string;
  max_valor: number;
  horarios: Record<string, { inicio: string; fim: string }>;
};

export type AgendamentoDia = { data: string; dia: number; semana: string };
export type AgendamentoSlot = { inicio: string; fim: string };

const SEMANA_ABREV = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function agendamentoMinutos(tipo: string, valor: number): number {
  return tipo === "horas" ? valor * 60 : valor * 24 * 60;
}

function agendamentoJanela(cfg: AgendamentoConfig): { minDate: Date; maxDate: Date | null } {
  const minMin = agendamentoMinutos(cfg.min_tipo, cfg.min_valor);
  const maxMin = cfg.max_valor > 0 ? agendamentoMinutos(cfg.max_tipo, cfg.max_valor) : null;
  const agora = new Date();
  const minDate = new Date(agora.getTime() + minMin * 60000);
  const maxDate = maxMin !== null ? new Date(agora.getTime() + maxMin * 60000) : null;
  return { minDate, maxDate };
}

function formatarDataISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function minutosParaHora(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function listarDiasAgendamento(cfg: AgendamentoConfig): AgendamentoDia[] {
  const { minDate, maxDate } = agendamentoJanela(cfg);
  const limite = maxDate ?? new Date(minDate.getTime() + 14 * 24 * 60 * 60000);
  const dias: AgendamentoDia[] = [];
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  for (let i = 0; i < 30 && cursor <= limite; i++) {
    const diaSemana = cursor.getDay() + 1;
    const horario = cfg.horarios[String(diaSemana)];
    if (horario?.inicio && horario?.fim) {
      dias.push({ data: formatarDataISO(cursor), dia: cursor.getDate(), semana: SEMANA_ABREV[cursor.getDay()] });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

export function listarSlotsAgendamento(cfg: AgendamentoConfig, dataIso: string): AgendamentoSlot[] {
  const diaSemana = new Date(`${dataIso}T00:00:00`).getDay() + 1;
  const horario = cfg.horarios[String(diaSemana)];
  if (!horario?.inicio || !horario?.fim) return [];
  const [hi, mi] = horario.inicio.split(":").map(Number);
  const [hf, mf] = horario.fim.split(":").map(Number);
  const fimMinutos = hf * 60 + mf;
  const { minDate, maxDate } = agendamentoJanela(cfg);

  const slots: AgendamentoSlot[] = [];
  for (let cur = hi * 60 + mi; cur + 30 <= fimMinutos; cur += 30) {
    const inicioSlot = new Date(`${dataIso}T00:00:00`);
    inicioSlot.setMinutes(cur);
    if (inicioSlot >= minDate && (!maxDate || inicioSlot <= maxDate)) {
      slots.push({ inicio: minutosParaHora(cur), fim: minutosParaHora(cur + 30) });
    }
  }
  return slots;
}
