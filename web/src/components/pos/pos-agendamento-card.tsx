"use client";

import { CalendarClock } from "lucide-react";

export function PosAgendamentoCard() {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-3">
      <div>
        <div className="mb-0.5 text-xs font-semibold text-muted-foreground">Agendamento</div>
        <div className="text-sm text-muted-foreground">Pedido disponível para agendamento</div>
      </div>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CalendarClock className="size-4" />
      </div>
    </div>
  );
}
