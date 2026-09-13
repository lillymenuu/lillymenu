"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FinanceiroFormaPagamento } from "@/lib/financeiroFormasPagamento";

export function PaymentMethodFormDialog({
  open,
  onOpenChange,
  forma,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  forma: FinanceiroFormaPagamento | null;
  onSalvo: () => void;
}) {
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (forma) {
      setName(forma.name);
      setActive(forma.active);
    } else {
      setName("");
      setActive(true);
    }
  }, [open, forma]);

  async function salvar() {
    if (!name.trim()) {
      toast.error("Preencha o nome da forma de pagamento.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/financialpaymentmethods/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: forma?.id ?? 0, name, active }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar forma de pagamento.");
        return;
      }
      toast.success(data.msg ?? "Forma de pagamento salva.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar forma de pagamento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[400px] max-w-[calc(100%-2rem)] sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{forma ? "Editar forma de pagamento" : "Nova forma de pagamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Dinheiro, Pix, Cartão" />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label className="text-sm">Forma de pagamento ativa</Label>
            <Switch checked={active} onCheckedChange={setActive} />
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
