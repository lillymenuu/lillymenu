"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ConfiguracoesDetalhe } from "@/lib/settings";

type Pedidos = ConfiguracoesDetalhe["pedidos"];

export function TiposPedidosDialog({
  open,
  onOpenChange,
  pedidos,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedidos: Pedidos;
  onSalvo: () => void;
}) {
  const [entregaAtiva, setEntregaAtiva] = useState(pedidos.entrega.ativo);
  const [entregaMin, setEntregaMin] = useState(String(pedidos.entrega.tempo_min));
  const [entregaMax, setEntregaMax] = useState(String(pedidos.entrega.tempo_max));
  const [horarioIni, setHorarioIni] = useState(pedidos.entrega.horario_ini);
  const [horarioFim, setHorarioFim] = useState(pedidos.entrega.horario_fim);
  const [retiradaAtiva, setRetiradaAtiva] = useState(pedidos.retirada.ativo);
  const [retiradaMin, setRetiradaMin] = useState(String(pedidos.retirada.tempo_min));
  const [retiradaMax, setRetiradaMax] = useState(String(pedidos.retirada.tempo_max));
  const [localAtivo, setLocalAtivo] = useState(pedidos.local_ativo);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEntregaAtiva(pedidos.entrega.ativo);
    setEntregaMin(String(pedidos.entrega.tempo_min));
    setEntregaMax(String(pedidos.entrega.tempo_max));
    setHorarioIni(pedidos.entrega.horario_ini);
    setHorarioFim(pedidos.entrega.horario_fim);
    setRetiradaAtiva(pedidos.retirada.ativo);
    setRetiradaMin(String(pedidos.retirada.tempo_min));
    setRetiradaMax(String(pedidos.retirada.tempo_max));
    setLocalAtivo(pedidos.local_ativo);
  }, [open, pedidos]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedido_entrega_ativo: entregaAtiva ? "1" : "0",
          tempo_entrega_min: entregaMin || "0",
          tempo_entrega_max: entregaMax || "0",
          horario_entrega_ini: horarioIni,
          horario_entrega_fim: horarioFim,
          pedido_retirada_ativo: retiradaAtiva ? "1" : "0",
          tempo_retirada_min: retiradaMin || "0",
          tempo_retirada_max: retiradaMax || "0",
          pedido_local_ativo: localAtivo ? "1" : "0",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Configuração salva.");
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
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tipos de pedidos</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Receber pedidos de entrega</div>
                <div className="text-xs text-muted-foreground">Seus clientes poderão solicitar pedidos para entrega.</div>
              </div>
              <Switch checked={entregaAtiva} onCheckedChange={setEntregaAtiva} />
            </div>
            {entregaAtiva ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tempo mín. estimado (min)</Label>
                    <Input type="number" min="0" value={entregaMin} onChange={(e) => setEntregaMin(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tempo máx. estimado (min)</Label>
                    <Input type="number" min="0" value={entregaMax} onChange={(e) => setEntregaMax(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Horário de funcionamento da entrega (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="time" className="max-w-36" value={horarioIni} onChange={(e) => setHorarioIni(e.target.value)} />
                    <span className="text-xs text-muted-foreground">até</span>
                    <Input type="time" className="max-w-36" value={horarioFim} onChange={(e) => setHorarioFim(e.target.value)} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fora desse horário, &quot;Receber pedidos de entrega&quot; é desativado automaticamente. Deixe em branco para não
                    aplicar horário automático.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Receber pedidos de retirada</div>
                <div className="text-xs text-muted-foreground">Seus clientes poderão solicitar pedidos para retirada no seu local.</div>
              </div>
              <Switch checked={retiradaAtiva} onCheckedChange={setRetiradaAtiva} />
            </div>
            {retiradaAtiva ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tempo mín. estimado (min)</Label>
                  <Input type="number" min="0" value={retiradaMin} onChange={(e) => setRetiradaMin(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tempo máx. estimado (min)</Label>
                  <Input type="number" min="0" value={retiradaMax} onChange={(e) => setRetiradaMax(e.target.value)} />
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Consumo local</div>
              <div className="text-xs text-muted-foreground">Seus clientes poderão solicitar pedidos para consumir no seu local.</div>
            </div>
            <Switch checked={localAtivo} onCheckedChange={setLocalAtivo} />
          </div>
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
