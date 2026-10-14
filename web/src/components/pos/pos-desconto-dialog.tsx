"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/produtos/money-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/components/ordermanager/constants";
import { cn } from "cn";

export function PosDescontoDialog({
  open,
  onOpenChange,
  restanteAntes,
  descontoReaisAtual,
  onAplicar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Valor ainda a pagar ANTES desse desconto — e sobre o que "em %" e calculado. */
  restanteAntes: number;
  descontoReaisAtual: number;
  onAplicar: (valorReais: number) => void;
}) {
  const [tipo, setTipo] = useState<"valor" | "percent">("valor");
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (!open) return;
    setTipo("valor");
    setValor(descontoReaisAtual > 0 ? String(descontoReaisAtual) : "");
  }, [open, descontoReaisAtual]);

  const valorNum = Math.max(0, Number(valor.replace(",", ".")) || 0);
  const descontoEmReais = tipo === "percent" ? Math.round(restanteAntes * (valorNum / 100) * 100) / 100 : valorNum;
  const excede = descontoEmReais > restanteAntes;

  function aplicar() {
    if (excede) return;
    onAplicar(descontoEmReais);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Aplicar desconto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            O desconto será aplicado no valor restante a ser pago de <span className="font-semibold text-foreground">{formatBRL(restanteAntes)}</span>
          </p>

          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setTipo("valor")}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                tipo === "valor" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Em reais
            </button>
            <button
              type="button"
              onClick={() => setTipo("percent")}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                tipo === "percent" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Em porcentagem
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Valor do desconto</Label>
            {tipo === "valor" ? (
              <MoneyInput value={valor} onChange={setValor} className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm" placeholder="ex: R$ 10,00" />
            ) : (
              <Input
                type="number"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                placeholder="ex: 10"
              />
            )}
            {excede ? (
              <p className="text-[11px] text-destructive">O desconto não pode ser maior que o valor restante ({formatBRL(restanteAntes)}).</p>
            ) : tipo === "percent" && valorNum > 0 ? (
              <p className="text-[11px] text-muted-foreground">Equivale a {formatBRL(descontoEmReais)}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="border-t-0 bg-transparent sm:justify-end">
          <Button className="rounded-full px-6" onClick={aplicar} disabled={excede || valorNum <= 0}>
            Aplicar desconto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
