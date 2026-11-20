"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calculator, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/produtos/money-input";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatDataHoraCurta } from "@/components/cliente/types";
import type { CaixaAtual } from "@/lib/caixa";
import { CalculadoraCedulas, totalContagem, type ContagemCedulas } from "@/components/cashcontrol/calculadora-cedulas";

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
  const [calcAberta, setCalcAberta] = useState(false);
  const [contagem, setContagem] = useState<ContagemCedulas>({});

  /* Com a calculadora aberta, o valor do campo e o total da contagem de cedulas. */
  function mudarContagem(c: ContagemCedulas) {
    setContagem(c);
    const total = totalContagem(c);
    if (modo === "fechar") setSaldoFinal(total);
    else setSaldoInicial(total);
  }

  function alternarCalc() {
    if (!calcAberta) mudarContagem(contagem);
    setCalcAberta((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    setSaldoInicial("");
    setSaldoFinal(totalVendasAtual ? totalVendasAtual.toFixed(2) : "");
    setObsAberta(false);
    setObservacoes("");
    setCalcAberta(false);
    setContagem({});
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
      <DialogContent className={`rounded-3xl transition-[max-width] ${calcAberta ? "max-w-2xl sm:max-w-2xl" : "max-w-sm sm:max-w-sm"}`}>
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
                className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm text-muted-foreground"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="caixa-saldo-final">Saldo final</Label>
              <input
                id="caixa-saldo-final"
                type="number"
                step="0.01"
                value={saldoFinal}
                readOnly={calcAberta}
                onChange={(e) => setSaldoFinal(e.target.value)}
                className={`h-10 rounded-full border-0 bg-muted/60 px-4 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/60 ${calcAberta ? "w-full text-muted-foreground sm:w-56" : "w-full"}`}
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
                className="w-full rounded-2xl border-0 bg-muted/60 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-3 focus-visible:ring-primary/60"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="caixa-saldo-inicial">Saldo inicial</Label>
            <MoneyInput
              id="caixa-saldo-inicial"
              value={saldoInicial}
              onChange={setSaldoInicial}
              readOnly={calcAberta}
              className={`h-10 rounded-full border-0 bg-muted/60 px-4 text-sm ${calcAberta ? "w-full text-muted-foreground sm:w-56" : "w-full"}`}
            />
          </div>
        )}
        {calcAberta ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Contagem de cédulas</span>
              <button
                type="button"
                onClick={alternarCalc}
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" /> Ocultar contagem de cédulas
              </button>
            </div>
            <CalculadoraCedulas contagem={contagem} onChange={mudarContagem} />
          </div>
        ) : null}
        <DialogFooter className="border-t-0 bg-transparent">
          {!calcAberta && (
            <Button variant="outline" className="rounded-full font-normal text-primary" onClick={alternarCalc} disabled={salvando}>
              <Calculator className="size-4" /> Calculadora de cédulas
            </Button>
          )}
          <Button className="rounded-full font-normal" onClick={confirmar} disabled={salvando}>
            {salvando ? "Salvando..." : modo === "fechar" ? "Fechar caixa" : "Abrir caixa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
