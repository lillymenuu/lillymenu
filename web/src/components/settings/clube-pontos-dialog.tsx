"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function ClubePontosDialog({
  open,
  onOpenChange,
  ativo,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ativo: boolean;
  onSalvo: () => void;
}) {
  const [valor, setValor] = useState(ativo);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) setValor(ativo);
  }, [open, ativo]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clube_pontos_ativo: valor ? "1" : "0" }),
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
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Clube de pontos</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">Ativar clube de pontos</div>
            <div className="text-xs text-muted-foreground">Seus clientes acumulam pontos a cada pedido.</div>
          </div>
          <Switch checked={valor} onCheckedChange={setValor} />
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
