"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ConfiguracoesDetalhe } from "@/lib/settings";
import { DIAS_SEMANA_LONGO } from "@/lib/settings";

type HorariosCfg = ConfiguracoesDetalhe["horarios"];
type Linha = { dia: number; aberto: boolean; inicio: string; fim: string };

function montarLinhas(horarios: HorariosCfg): Linha[] {
  return [1, 2, 3, 4, 5, 6, 7].map((dia) => {
    const h = horarios.por_dia[String(dia)];
    return h ? { dia, aberto: true, inicio: h.inicio, fim: h.fim } : { dia, aberto: false, inicio: "13:00", fim: "19:00" };
  });
}

export function HorariosDialog({
  open,
  onOpenChange,
  horarios,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  horarios: HorariosCfg;
  onSalvo: () => void;
}) {
  const [linhas, setLinhas] = useState<Linha[]>(montarLinhas(horarios));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) setLinhas(montarLinhas(horarios));
  }, [open, horarios]);

  function atualizar(dia: number, patch: Partial<Linha>) {
    setLinhas((atual) => atual.map((l) => (l.dia === dia ? { ...l, ...patch } : l)));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const horariosJson: Record<string, { inicio: string; fim: string }> = {};
      const diasAtivos: number[] = [];
      linhas.forEach((l) => {
        if (l.aberto) {
          horariosJson[l.dia] = { inicio: l.inicio, fim: l.fim };
          diasAtivos.push(l.dia);
        }
      });
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horarios_semana: JSON.stringify(horariosJson),
          dias_funcionamento: diasAtivos,
          horario_abertura: horarios.abertura,
          horario_fechamento: horarios.fechamento,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Horários salvos.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Horário de funcionamento</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Sua loja irá abrir e fechar automaticamente de acordo com os horários definidos. Dias sem horário configurado ficam fechados.
        </p>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {linhas.map((l) => (
            <div key={l.dia} className="flex items-center gap-2 rounded-lg border p-2.5">
              <div className="w-20 shrink-0 text-sm font-medium">{DIAS_SEMANA_LONGO[l.dia]}</div>
              {l.aberto ? (
                <>
                  <Input type="time" value={l.inicio} onChange={(e) => atualizar(l.dia, { inicio: e.target.value })} />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input type="time" value={l.fim} onChange={(e) => atualizar(l.dia, { fim: e.target.value })} />
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => atualizar(l.dia, { aberto: false })}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => atualizar(l.dia, { aberto: true })}
                  className="flex-1 rounded-md border border-dashed px-2 py-1 text-left text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  Loja fechada — clique para definir horário
                </button>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
