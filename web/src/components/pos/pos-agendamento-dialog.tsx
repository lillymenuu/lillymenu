"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type AgendamentoConfig, type AgendamentoDia, listarDiasAgendamento, listarSlotsAgendamento } from "@/lib/agendamento";

export function PosAgendamentoDialog({
  open,
  onOpenChange,
  cfg,
  valorAtual,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cfg: AgendamentoConfig;
  valorAtual: { data: string; hora: string } | null;
  onConfirmar: (v: { data: string; hora: string }) => void;
}) {
  const [dias, setDias] = useState<AgendamentoDia[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [horaSelecionada, setHoraSelecionada] = useState<string | null>(null);
  const diasScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const lista = listarDiasAgendamento(cfg);
    setDias(lista);
    const diaInicial = lista.some((d) => d.data === valorAtual?.data) ? (valorAtual?.data ?? null) : (lista[0]?.data ?? null);
    setDiaSelecionado(diaInicial);
    setHoraSelecionada(valorAtual && valorAtual.data === diaInicial ? valorAtual.hora : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const slots = diaSelecionado ? listarSlotsAgendamento(cfg, diaSelecionado) : [];

  function rolar(dir: number) {
    diasScrollRef.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  }

  function confirmar() {
    if (!diaSelecionado || !horaSelecionada) return;
    onConfirmar({ data: diaSelecionado, hora: horaSelecionada });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecione o dia e a hora para agendar o pedido</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <div ref={diasScrollRef} className="scrollbar-none flex gap-2 overflow-x-auto px-9">
            {dias.map((d) => {
              const ativo = d.data === diaSelecionado;
              return (
                <button
                  key={d.data}
                  type="button"
                  onClick={() => {
                    setDiaSelecionado(d.data);
                    setHoraSelecionada(null);
                  }}
                  className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3.5 py-2 text-sm transition-colors ${
                    ativo ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <span className="font-semibold">{d.dia}</span>
                  <span className="text-[11px] capitalize">{d.semana}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => rolar(-1)}
            className="absolute top-1/2 left-0 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:bg-muted/50"
            aria-label="Dia anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => rolar(1)}
            className="absolute top-1/2 right-0 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:bg-muted/50"
            aria-label="Próximo dia"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="max-h-[45vh] space-y-2 overflow-y-auto py-1">
          {slots.length === 0 ? (
            <div className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
              Nenhum horário disponível para esse dia.
            </div>
          ) : (
            slots.map((s) => {
              const ativo = s.inicio === horaSelecionada;
              return (
                <button
                  key={s.inicio}
                  type="button"
                  onClick={() => setHoraSelecionada(s.inicio)}
                  className={`block w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    ativo ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/40"
                  }`}
                >
                  {s.inicio} - {s.fim}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="justify-end">
          <Button onClick={confirmar} disabled={!diaSelecionado || !horaSelecionada}>
            Salvar agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
