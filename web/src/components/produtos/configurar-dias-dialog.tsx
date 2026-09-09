"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

const DIAS = [
  { value: "dom", label: "Dom" },
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
  { value: "sab", label: "Sáb" },
];

export function ConfigurarDiasDialog({
  open,
  onOpenChange,
  diasSemana,
  horarioIni,
  horarioFim,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  diasSemana: string[];
  horarioIni: string;
  horarioFim: string;
  onConfirm: (dias: string[], ini: string, fim: string) => void;
}) {
  const [dias, setDias] = useState<string[]>(diasSemana);
  const [ini, setIni] = useState(horarioIni);
  const [fim, setFim] = useState(horarioFim);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDias(diasSemana);
    setIni(horarioIni);
    setFim(horarioFim);
    setErro(null);
  }, [open, diasSemana, horarioIni, horarioFim]);

  function toggleDia(d: string) {
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function confirmar() {
    if (dias.length === 0 && !ini && !fim) {
      onConfirm([], "", "");
      onOpenChange(false);
      return;
    }
    if (dias.length === 0) {
      setErro("Selecione ao menos um dia da semana.");
      return;
    }
    if (!ini || !fim) {
      setErro("Informe o horário inicial e final.");
      return;
    }
    onConfirm(dias, ini, fim);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dias específicos</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Dias da semana</Label>
            <div className="flex flex-wrap gap-1.5">
              {DIAS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDia(d.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    dias.includes(d.value) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dia-ini">Horário inicial</Label>
              <input
                id="dia-ini"
                type="time"
                value={ini}
                onChange={(e) => setIni(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dia-fim">Horário final</Label>
              <input
                id="dia-fim"
                type="time"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
