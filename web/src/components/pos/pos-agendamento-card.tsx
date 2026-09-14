"use client";

import { CalendarClock, X } from "lucide-react";

const SEMANA_ABREV = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatarResumo(data: string, hora: string): string {
  const d = new Date(`${data}T00:00:00`);
  const dataFmt = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${SEMANA_ABREV[d.getDay()]}, ${dataFmt} às ${hora}`;
}

export function PosAgendamentoCard({
  valor,
  onAbrir,
  onLimpar,
}: {
  valor: { data: string; hora: string } | null;
  onAbrir: () => void;
  onLimpar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="flex w-full items-center justify-between rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/30"
    >
      <div>
        <div className="mb-0.5 text-xs font-semibold text-muted-foreground">Agendamento</div>
        <div className="text-sm text-muted-foreground">
          {valor ? <span className="font-medium text-foreground">{formatarResumo(valor.data, valor.hora)}</span> : "Pedido disponível para agendamento"}
        </div>
      </div>
      {valor ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onLimpar();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onLimpar();
            }
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
        >
          <X className="size-4" />
        </span>
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CalendarClock className="size-4" />
        </div>
      )}
    </button>
  );
}
