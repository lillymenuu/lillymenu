"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import type { Pausa, PausasListarResposta } from "@/lib/settings";

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PausaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [pausas, setPausas] = useState<Pausa[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [horaInicio, setHoraInicio] = useState("");
  const [dataFim, setDataFim] = useState(hojeISO());
  const [horaFim, setHoraFim] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluirId, setExcluirId] = useState<number | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/settings/pausas");
      const data: PausasListarResposta = await res.json();
      if (data.ok) setPausas(data.pausas);
    } catch {
      toast.error("Erro ao carregar pausas programadas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (open) {
      carregar();
      setMostrarForm(false);
    }
  }, [open]);

  function abrirNovaForm() {
    setTitulo("");
    setDataInicio(hojeISO());
    setHoraInicio("");
    setDataFim(hojeISO());
    setHoraFim("");
    setMostrarForm(true);
  }

  async function salvar() {
    if (!titulo.trim()) {
      toast.error("Informe um título para a pausa.");
      return;
    }
    if (!horaInicio || !horaFim) {
      toast.error("Informe o horário inicial e final.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/pausas/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, data_inicio: dataInicio, hora_inicio: horaInicio, data_fim: dataFim, hora_fim: horaFim }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar pausa.");
        return;
      }
      toast.success("Pausa programada salva.");
      setMostrarForm(false);
      carregar();
    } catch {
      toast.error("Erro ao salvar pausa.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!excluirId) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/settings/pausas/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: excluirId }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir pausa.");
        return;
      }
      toast.success("Pausa removida.");
      setExcluirId(null);
      carregar();
    } catch {
      toast.error("Erro ao excluir pausa.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-md rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pausa programada</DialogTitle>
          </DialogHeader>

          {mostrarForm ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={100}
                  placeholder="Ex.: Manutenção"
                  className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Data início</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="h-10 w-full rounded-full border-0 bg-muted/60 pr-5 pl-4 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hora início</Label>
                  <Input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="h-10 w-full rounded-full border-0 bg-muted/60 pr-5 pl-4 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data fim</Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="h-10 w-full rounded-full border-0 bg-muted/60 pr-5 pl-4 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hora fim</Label>
                  <Input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="h-10 w-full rounded-full border-0 bg-muted/60 pr-5 pl-4 text-sm"
                  />
                </div>
              </div>
              <DialogFooter className="border-t-0 bg-transparent">
                <Button variant="outline" className="rounded-full" onClick={() => setMostrarForm(false)} disabled={salvando}>
                  Cancelar
                </Button>
                <Button className="rounded-full" onClick={salvar} disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar pausa"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Agende pausas automáticas — a loja fica fechada nesses períodos.</p>
              <div className="scrollbar-hidden max-h-[45vh] space-y-2 overflow-y-auto px-1">
                {carregando ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Carregando...</div>
                ) : pausas.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma pausa programada.</div>
                ) : (
                  pausas.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border p-2.5">
                      <div>
                        <div className="text-sm font-medium">{p.titulo}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.data_inicio.split("-").reverse().join("/")} {p.hora_inicio.slice(0, 5)} até {p.data_fim.split("-").reverse().join("/")}{" "}
                          {p.hora_fim.slice(0, 5)}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setExcluirId(p.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <DialogFooter className="border-t-0 bg-transparent">
                <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button className="gap-1.5 rounded-full" onClick={abrirNovaForm}>
                  <Plus className="size-4" /> Nova pausa
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={excluirId !== null}
        onOpenChange={(v) => !v && setExcluirId(null)}
        titulo="Excluir pausa"
        descricao="Tem certeza que deseja excluir esta pausa programada?"
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onConfirmar={excluir}
      />
    </>
  );
}
