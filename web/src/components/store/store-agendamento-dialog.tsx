"use client";

import { useState } from "react";
import { Check, ChevronLeft, X } from "lucide-react";
import type { StoreAgendHorario, StorePerfil } from "@/lib/store/types";

const DIAS_NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

type DiaAgend = { date: Date; horario: StoreAgendHorario };

/** Espelha renderAgendDatas() do loja.js legado. */
function gerarDias(perfil: StorePerfil, tipo: "entrega_agendada" | "retirada_agendada"): DiaAgend[] {
  const horarios = tipo === "entrega_agendada" ? perfil.agendDeliveryHorarios : perfil.agendRetiradaHorarios;
  const minTipo = tipo === "entrega_agendada" ? perfil.agendDeliveryMinTipo : perfil.agendRetiradaMinTipo;
  const minVal = tipo === "entrega_agendada" ? perfil.agendDeliveryMinVal : perfil.agendRetiradaMinVal;
  const maxVal = tipo === "entrega_agendada" ? perfil.agendDeliveryMaxVal : perfil.agendRetiradaMaxVal;

  const agora = new Date();
  const minMs = minTipo === "horas" ? minVal * 3600000 : minVal * 86400000;
  const maxMs = maxVal * 86400000;
  let dataMin = new Date(agora.getTime() + minMs);
  const dataMax = new Date(agora.getTime() + maxMs);
  if (perfil.pausaAtivaFim) {
    const pausaFim = new Date(perfil.pausaAtivaFim.replace(" ", "T"));
    if (!isNaN(pausaFim.getTime()) && pausaFim > dataMin) dataMin = pausaFim;
  }

  const dias: DiaAgend[] = [];
  const d = new Date(dataMin);
  d.setHours(0, 0, 0, 0);
  while (d <= dataMax) {
    const diaJS = d.getDay();
    const diaKey = diaJS === 0 ? 1 : diaJS + 1;
    const horario = horarios[String(diaKey)];
    if (horario) dias.push({ date: new Date(d), horario });
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

/** Espelha renderAgendSlots() do loja.js legado — janelas de 30min. */
function gerarSlots(horario: StoreAgendHorario, dia: Date, pausaAtivaFim: string): string[] {
  const [hI, mI] = horario.inicio.split(":").map(Number);
  const [hF, mF] = horario.fim.split(":").map(Number);
  let cur = hI * 60 + mI;
  const fim = hF * 60 + mF;

  if (pausaAtivaFim) {
    const pausaFim = new Date(pausaAtivaFim.replace(" ", "T"));
    if (
      !isNaN(pausaFim.getTime()) &&
      pausaFim.getFullYear() === dia.getFullYear() &&
      pausaFim.getMonth() === dia.getMonth() &&
      pausaFim.getDate() === dia.getDate()
    ) {
      const pausaFimMin = pausaFim.getHours() * 60 + pausaFim.getMinutes();
      if (pausaFimMin > cur) cur = Math.ceil(pausaFimMin / 30) * 30;
    }
  }

  const slots: string[] = [];
  while (cur + 30 <= fim) {
    const hA = String(Math.floor(cur / 60)).padStart(2, "0");
    const mA = String(cur % 60).padStart(2, "0");
    const hB = String(Math.floor((cur + 30) / 60)).padStart(2, "0");
    const mB = String((cur + 30) % 60).padStart(2, "0");
    slots.push(`${hA}:${mA} - ${hB}:${mB}`);
    cur += 30;
  }
  return slots;
}

/**
 * Overlay de agendamento (data+horario), renderizado DENTRO do proprio
 * DialogContent do checkout (posicionamento absolute, preenchendo o box ja
 * centralizado do checkout) — nao um <Dialog> separado. Dois <Dialog>
 * full-screen com centralizacao via transform (fixed + left-1/2
 * -translate-x-1/2) abertos ao mesmo tempo quebravam a centralizacao do
 * segundo nesse base-ui/floating-ui (mesmo fechando o primeiro em seguida,
 * a transicao sobreposta ja deixava o layout corrompido). Um overlay
 * absolute dentro do box ja aberto nao tem esse problema.
 */
export function StoreAgendamentoOverlay({
  brown,
  perfil,
  tipo,
  onFechar,
  onConfirmar,
}: {
  brown: string;
  perfil: StorePerfil;
  tipo: "entrega_agendada" | "retirada_agendada";
  onFechar: () => void;
  onConfirmar: (data: Date, slot: string) => void;
}) {
  const [dias] = useState(() => gerarDias(perfil, tipo));
  const [diaIdx, setDiaIdx] = useState<number | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const diaSelecionado = diaIdx !== null ? dias[diaIdx] : null;
  const slots = diaSelecionado ? gerarSlots(diaSelecionado.horario, diaSelecionado.date, perfil.pausaAtivaFim) : [];

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
        <button type="button" onClick={onFechar} className="flex min-w-8 items-center text-neutral-500 hover:text-neutral-700">
          <ChevronLeft size={20} />
        </button>
        <span className="text-[.92rem] font-bold text-neutral-900">Agendamento</span>
        <div className="flex min-w-8 items-center justify-end">
          <button
            type="button"
            onClick={onFechar}
            className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <p className="mb-4 text-[.84rem] leading-relaxed text-neutral-500">Escolha a data e horario que voce deseja receber seu pedido:</p>

        <div className="mb-4 flex gap-2.5 overflow-x-auto pb-1">
          {dias.length === 0 && <p className="py-2 text-[.82rem] text-neutral-400">Nenhuma data disponivel</p>}
          {dias.map((dia, i) => {
            const ativo = i === diaIdx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setDiaIdx(i);
                  setSlot(null);
                }}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <span
                  className="flex size-[52px] items-center justify-center rounded-2xl text-[1.05rem] font-bold transition-colors"
                  style={ativo ? { background: brown, color: "#fff" } : { background: "#f5f5f5", color: "#111" }}
                >
                  {dia.date.getDate()}
                </span>
                <span className="text-[.72rem]" style={{ color: ativo ? brown : "#888", fontWeight: ativo ? 600 : 400 }}>
                  {DIAS_NOMES[dia.date.getDay()]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2.5">
          {diaIdx === null ? (
            <p className="py-8 text-center text-[.82rem] text-neutral-400">Selecione uma data acima</p>
          ) : slots.length === 0 ? (
            <p className="py-8 text-center text-[.82rem] text-neutral-400">Sem horarios disponiveis</p>
          ) : (
            slots.map((s) => {
              const ativo = s === slot;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={`flex w-full items-center rounded-xl border-[1.5px] px-4 py-4 text-[.9rem] font-semibold transition-colors ${
                    ativo ? "justify-between" : "justify-center"
                  }`}
                  style={ativo ? { borderColor: brown, color: brown } : { borderColor: "#e5e7eb", color: "#374151" }}
                >
                  <span>{s}</span>
                  {ativo && <Check size={17} style={{ color: brown }} />}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-neutral-100 px-4 py-3">
        {diaSelecionado && slot && (
          <p className="mb-2 text-center text-[.78rem] font-medium text-neutral-600">
            Data de agendamento: {diaSelecionado.date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })} {slot}
          </p>
        )}
        <button
          type="button"
          disabled={!diaSelecionado || !slot}
          onClick={() => {
            if (diaSelecionado && slot) onConfirmar(diaSelecionado.date, slot);
          }}
          className="w-full rounded-[10px] py-3.5 text-[.9rem] font-bold tracking-wide text-white transition-colors disabled:cursor-not-allowed"
          style={{ background: diaSelecionado && slot ? brown : "#c0a88a" }}
        >
          CONTINUAR
        </button>
      </div>
    </div>
  );
}
