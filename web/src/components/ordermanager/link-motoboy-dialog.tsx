"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Motoboy } from "@/lib/pedidos";

export function LinkMotoboyDialog({
  open,
  onOpenChange,
  pedidoId,
  pedidoNome,
  motoboys,
  motoboyAtualId,
  alerta = false,
  onVinculado,
  onPular,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedidoId: number | null;
  pedidoNome: string;
  motoboys: Motoboy[];
  motoboyAtualId: number | null;
  /** true = fluxo de aviso ao mover pra "Entrega" sem motoboy vinculado ainda */
  alerta?: boolean;
  onVinculado: (motoboyId: number | null, motoboyNome: string) => void;
  onPular?: () => void;
}) {
  const [selecionado, setSelecionado] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) setSelecionado(motoboyAtualId ? String(motoboyAtualId) : "");
  }, [open, motoboyAtualId]);

  const itens: Record<string, string> = { "": "Sem motoboy vinculado" };
  for (const m of motoboys) itens[String(m.id)] = `${m.nome} - ${m.whatsapp}`;

  async function vincular() {
    if (!pedidoId) return;
    if (alerta && !selecionado) {
      toast.error("Selecione um motoboy para vincular.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/ordermanager/motoboys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bind",
          pedido_id: pedidoId,
          motoboy_id: selecionado ? Number(selecionado) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.msg ?? "Erro ao vincular motoboy.");
        return;
      }
      toast.success(data.msg ?? "Motoboy vinculado com sucesso.");
      onOpenChange(false);
      onVinculado(selecionado ? Number(selecionado) : null, data.motoboy_nome ?? "");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Vincular motoboy</DialogTitle>
        </DialogHeader>
        {alerta && (
          <p className="text-sm text-muted-foreground">
            Esse pedido está em <strong className="text-foreground">ENTREGA</strong> e ainda não possui
            motoboy vinculado.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Pedido</span>
          <span className="text-sm font-medium">{pedidoNome}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Motoboy</span>
          <Select items={itens} value={selecionado} onValueChange={(v) => setSelecionado(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(itens).map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          {alerta ? (
            <Button variant="outline" onClick={() => { onOpenChange(false); onPular?.(); }} disabled={salvando}>
              Mover sem vincular
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
              Cancelar
            </Button>
          )}
          <Button onClick={vincular} disabled={salvando}>
            {salvando ? "Salvando..." : alerta ? "Vincular e mover" : "Salvar vínculo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
