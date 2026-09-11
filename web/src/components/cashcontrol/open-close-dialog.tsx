"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/produtos/money-input";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatDataHoraCurta } from "@/components/cliente/types";
import type { CaixaAtual } from "@/lib/caixa";

export function OpenCloseDialog({
  open,
  onOpenChange,
  caixaAtual,
  totalVendasAtual,
  onSucesso,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caixaAtual: CaixaAtual | null;
  totalVendasAtual: number;
  onSucesso: () => void;
}) {
  const modo = caixaAtual ? "fechar" : "abrir";

  const [saldoInicial, setSaldoInicial] = useState("");
  const [saldoFinal, setSaldoFinal] = useState("");
  const [obsAberta, setObsAberta] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaldoInicial("");
    setSaldoFinal(totalVendasAtual ? totalVendasAtual.toFixed(2) : "");
    setObsAberta(false);
    setObservacoes("");
  }, [open, totalVendasAtual]);

  async function confirmar() {
    setSalvando(true);
    try {
      if (modo === "fechar" && caixaAtual) {
        const res = await fetch("/api/cashcontrol/fechar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caixa_id: caixaAtual.id,
            saldo_final: parseFloat(saldoFinal || "0"),
            observacoes,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          toast.error(data.msg ?? "Não foi possível fechar o caixa.");
          return;
        }
        toast.success("Caixa fechado com sucesso.");
      } else {
        const res = await fetch("/api/cashcontrol/abrir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            saldo_inicial: parseFloat(saldoInicial || "0"),
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          toast.error(data.msg ?? "Não foi possível abrir o caixa.");
          return;
        }
        toast.success("Caixa aberto com sucesso.");
      }
      onOpenChange(false);
      onSucesso();
    } catch {
      toast.error(modo === "fechar" ? "Erro ao fechar o caixa." : "Erro ao abrir o caixa.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{modo === "fechar" ? "Fechar caixa" : "Abrir caixa"}</DialogTitle>
        </DialogHeader>
        {modo === "fechar" && caixaAtual ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Caixa aberto em {formatDataHoraCurta(caixaAtual.aberto_em)}</p>
            <div className="flex flex-col gap-1.5">
              <Label>Saldo inicial</Label>
              <input
                disabled
                value={formatBRL(caixaAtual.saldo_inicial)}
                className="h-8 rounded-lg border border-input bg-input/50 px-2.5 text-sm text-muted-foreground"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="caixa-saldo-final">Saldo final</Label>
              <input
                id="caixa-saldo-final"
                type="number"
                step="0.01"
                value={saldoFinal}
                onChange={(e) => setSaldoFinal(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="caixa-obs-toggle">Adicionar observação</Label>
              <Switch id="caixa-obs-toggle" checked={obsAberta} onCheckedChange={setObsAberta} />
            </div>
            {obsAberta && (
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observação do fechamento (opcional)"
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="caixa-saldo-inicial">Saldo inicial</Label>
            <MoneyInput id="caixa-saldo-inicial" value={saldoInicial} onChange={setSaldoInicial} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" className="rounded-lg font-normal" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button className="rounded-lg font-normal" onClick={confirmar} disabled={salvando}>
            {salvando ? "Salvando..." : modo === "fechar" ? "Fechar caixa" : "Abrir caixa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
