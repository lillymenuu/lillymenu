"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Banknote, CreditCard, Landmark } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

const FORMAS = [
  { forma: "dinheiro", label: "Dinheiro", icon: Banknote },
  { forma: "pix", label: "Pix", icon: Landmark },
  { forma: "credito", label: "Crédito", icon: CreditCard },
  { forma: "debito", label: "Débito", icon: CreditCard },
  { forma: "voucher", label: "Voucher", icon: CreditCard },
  { forma: "outro", label: "Outro", icon: CreditCard },
] as const;

export function RegistrarPagamentoDialog({
  open,
  onOpenChange,
  clienteId,
  onRegistrado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: number;
  onRegistrado: (saldoFiado: number) => void;
}) {
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState<string>("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValor("");
    setForma("");
  }, [open]);

  async function salvar() {
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!valorNum || valorNum <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (!forma) {
      toast.error("Selecione o método de pagamento.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/storecredittracking/pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteId, valor: valorNum, forma_pagamento: forma }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao registrar pagamento.");
        return;
      }
      toast.success("Pagamento registrado com sucesso.");
      onOpenChange(false);
      onRegistrado(data.saldo_fiado ?? 0);
    } catch {
      toast.error("Erro ao registrar pagamento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pagamento-valor">Valor a ser pago</Label>
            <Input
              id="pagamento-valor"
              inputMode="decimal"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div>
            <Label>Qual método de pagamento?</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {FORMAS.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.forma}
                    type="button"
                    onClick={() => setForma(f.forma)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-xs transition-colors",
                      forma === f.forma ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/30"
                    )}
                  >
                    <Icon className="size-5" />
                    {f.label}
                  </button>
                );
              })}
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
