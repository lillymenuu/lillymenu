"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/produtos/money-input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/components/ordermanager/constants";

export function PosTrocoDialog({
  open,
  onOpenChange,
  quantiaACobrar,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quantiaACobrar: number;
  /** recebida=null quando o operador clica "Nao preciso" (sem calculo de troco). */
  onConfirmar: (recebida: number | null) => void;
}) {
  const [recebida, setRecebida] = useState("");

  useEffect(() => {
    if (!open) return;
    setRecebida("");
  }, [open]);

  const recebidaNum = Math.max(0, Number(recebida.replace(",", ".")) || 0);
  const troco = Math.max(0, Math.round((recebidaNum - quantiaACobrar) * 100) / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Precisa de troco?</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Quantia recebida</Label>
            <MoneyInput value={recebida} onChange={setRecebida} className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm" autoFocus />
          </div>
          <p className="text-xs text-muted-foreground">
            Quantia à ser cobrada <span className="font-semibold text-foreground">{formatBRL(quantiaACobrar)}</span>
          </p>
          {troco > 0 ? (
            <p className="text-xs text-muted-foreground">
              Troco <span className="font-semibold text-foreground">{formatBRL(troco)}</span>
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t-0 bg-transparent sm:justify-end">
          <Button variant="outline" className="rounded-full" onClick={() => onConfirmar(null)}>
            Não preciso
          </Button>
          <Button className="rounded-full" onClick={() => onConfirmar(Math.max(0, Number(recebida) || 0))}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
