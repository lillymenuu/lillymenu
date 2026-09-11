"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/components/ordermanager/constants";
import type { CaixaAtual } from "@/lib/caixa";

export function EditAberturaDialog({
  open,
  onOpenChange,
  caixaAtual,
  onSucesso,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caixaAtual: CaixaAtual | null;
  onSucesso: () => void;
}) {
  const [hora, setHora] = useState("");
  const [salvando, setSalvando] = useState(false);

  const dataParte = caixaAtual?.aberto_em?.slice(0, 10) ?? "";

  useEffect(() => {
    if (!open || !caixaAtual) return;
    setHora(caixaAtual.aberto_em.slice(11, 16));
  }, [open, caixaAtual]);

  async function salvar() {
    if (!caixaAtual || !hora) {
      toast.error("Informe o novo horário de abertura.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/cashcontrol/editar-abertura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caixa_id: caixaAtual.id, aberto_em: `${dataParte} ${hora}:00` }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível editar o horário.");
        return;
      }
      toast.success("Horário de abertura atualizado.");
      onOpenChange(false);
      onSucesso();
    } catch {
      toast.error("Erro ao editar o horário.");
    } finally {
      setSalvando(false);
    }
  }

  if (!caixaAtual) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar horário de abertura</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Operador</div>
              <div>{caixaAtual.operador ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Saldo inicial</div>
              <div>{formatBRL(caixaAtual.saldo_inicial)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>Data</Label>
              <Input disabled value={dataParte.split("-").reverse().join("/")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="caixa-editar-hora">Hora</Label>
              <Input id="caixa-editar-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-lg font-normal" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button className="rounded-lg font-normal" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
