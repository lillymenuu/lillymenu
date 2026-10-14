"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/produtos/money-input";
import { formatBRL } from "@/components/ordermanager/constants";

function formatarValidade(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ano, mes - 1, dia));
}

export function PosCashbackDialog({
  open,
  onOpenChange,
  saldoDisponivel,
  validoAte,
  valorInicial,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saldoDisponivel: number;
  validoAte?: string | null;
  valorInicial: number;
  onConfirmar: (valor: number) => void;
}) {
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (!open) return;
    setValor(valorInicial > 0 ? String(valorInicial) : "");
  }, [open, valorInicial]);

  const valorNum = Math.max(0, Number(valor) || 0);
  const excedeSaldo = valorNum > saldoDisponivel;

  function usar() {
    if (excedeSaldo) return;
    onConfirmar(valorNum);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cashback</DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5">
          <div className="space-y-0.5">
            <div className="text-[11px] font-normal text-muted-foreground">Saldo disponível</div>
            <div className="text-sm font-semibold">{formatBRL(saldoDisponivel)}</div>
            {validoAte ? <div className="text-[11px] text-muted-foreground">Válido até {formatarValidade(validoAte)}</div> : null}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium">Qual valor de cashback você deseja utilizar neste pedido?</p>
            <MoneyInput value={valor} onChange={setValor} className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm" />
            {excedeSaldo ? (
              <p className="text-[11px] text-destructive">O valor não pode ser maior que o saldo disponível ({formatBRL(saldoDisponivel)}).</p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="border-t-0 bg-transparent">
          <Button className="h-11 w-full rounded-full" onClick={usar} disabled={excedeSaldo}>
            Usar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
