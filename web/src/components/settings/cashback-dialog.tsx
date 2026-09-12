"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ConfiguracoesDetalhe } from "@/lib/settings";

type Cashback = ConfiguracoesDetalhe["cashback"];

export function CashbackDialog({
  open,
  onOpenChange,
  cashback,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cashback: Cashback;
  onSalvo: () => void;
}) {
  const [ativo, setAtivo] = useState(cashback.ativo);
  const [percentual, setPercentual] = useState(String(cashback.percentual ?? ""));
  const [expiraDias, setExpiraDias] = useState(String(cashback.expira_dias ?? ""));
  const [carenciaHoras, setCarenciaHoras] = useState(String(cashback.carencia_horas ?? ""));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAtivo(cashback.ativo);
    setPercentual(String(cashback.percentual ?? ""));
    setExpiraDias(String(cashback.expira_dias ?? ""));
    setCarenciaHoras(String(cashback.carencia_horas ?? ""));
  }, [open, cashback]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashback_ativo: ativo ? "1" : "0",
          cashback_percentual: percentual || "0",
          cashback_expira_dias: expiraDias || "0",
          cashback_carencia_horas: carenciaHoras || "0",
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

  const percentualNum = Number(percentual.replace(",", ".")) || 0;
  const valorPago = 50;
  const valorCashback = (valorPago * percentualNum) / 100;
  const formatarBRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cashback</DialogTitle>
        </DialogHeader>

        <div>
          <div className="text-sm font-medium">Vantagens</div>
          <p className="mt-1 text-sm text-muted-foreground">
            O cashback ajuda a aumentar o ticket médio do seu negócio e a fidelizar cada vez mais o seu cliente.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="text-sm font-medium">Cashback habilitado</div>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </div>
        {ativo ? (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="space-y-1">
              <Label className="text-xs">O cashback deve expirar em quantos dias?</Label>
              <Input type="number" min="1" step="1" value={expiraDias} onChange={(e) => setExpiraDias(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cashback fica disponível para uso após quantas horas da compra?</Label>
              <Input type="number" min="0" step="1" placeholder="12" value={carenciaHoras} onChange={(e) => setCarenciaHoras(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Porcentagem do cashback</Label>
              <Input type="number" step="0.01" min="0" max="100" value={percentual} onChange={(e) => setPercentual(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div>
                <div className="text-xs text-muted-foreground">Pago pelo cliente</div>
                <div className="text-sm font-medium">Seu cliente receberá de cashback</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">{formatarBRL(valorPago)}</div>
                <div className="text-sm font-semibold">{formatarBRL(valorCashback)}</div>
              </div>
            </div>
          </div>
        ) : null}
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
