"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/produtos/money-input";
import type { ConfiguracoesDetalhe } from "@/lib/settings";

type Pedidos = ConfiguracoesDetalhe["pedidos"];

export function ValorMinimoDialog({
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
  const [entregaAtiva, setEntregaAtiva] = useState(pedidos.pedido_minimo_entrega_ativo);
  const [entregaValor, setEntregaValor] = useState(String(pedidos.pedido_minimo_entrega || ""));
  const [retiradaAtiva, setRetiradaAtiva] = useState(pedidos.pedido_minimo_retirada_ativo);
  const [retiradaValor, setRetiradaValor] = useState(String(pedidos.pedido_minimo_retirada || ""));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEntregaAtiva(pedidos.pedido_minimo_entrega_ativo);
    setEntregaValor(String(pedidos.pedido_minimo_entrega || ""));
    setRetiradaAtiva(pedidos.pedido_minimo_retirada_ativo);
    setRetiradaValor(String(pedidos.pedido_minimo_retirada || ""));
  }, [open, pedidos]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedido_minimo_entrega_ativo: entregaAtiva ? "1" : "0",
          pedido_minimo_entrega: entregaValor || "0",
          pedido_minimo_retirada_ativo: retiradaAtiva ? "1" : "0",
          pedido_minimo_retirada: retiradaValor || "0",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Valor mínimo do pedido</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Para finalizar o pedido, o valor precisará ser igual ou superior ao valor que você definir.
        </p>
        <div className="space-y-3">
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Valor mínimo para entrega</div>
              <Switch checked={entregaAtiva} onCheckedChange={setEntregaAtiva} />
            </div>
            {entregaAtiva ? (
              <div className="space-y-1">
                <Label className="text-xs">Valor mínimo</Label>
                <MoneyInput value={entregaValor} onChange={setEntregaValor} />
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Valor mínimo para retirada</div>
              <Switch checked={retiradaAtiva} onCheckedChange={setRetiradaAtiva} />
            </div>
            {retiradaAtiva ? (
              <div className="space-y-1">
                <Label className="text-xs">Valor mínimo</Label>
                <MoneyInput value={retiradaValor} onChange={setRetiradaValor} />
              </div>
            ) : null}
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
