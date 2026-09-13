"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/produtos/money-input";
import type { FinanceiroConta } from "@/lib/financeiroContas";

export function AccountFormDialog({
  open,
  onOpenChange,
  conta,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conta: FinanceiroConta | null;
  onSalvo: () => void;
}) {
  const [name, setName] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [saldoAtual, setSaldoAtual] = useState("");
  const [saldoAtualTocado, setSaldoAtualTocado] = useState(false);
  const [active, setActive] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (conta) {
      setName(conta.name);
      setSaldoInicial(String(conta.initial_balance));
      setSaldoAtual(String(conta.current_balance));
      setSaldoAtualTocado(true);
      setActive(conta.active);
    } else {
      setName("");
      setSaldoInicial("");
      setSaldoAtual("");
      setSaldoAtualTocado(false);
      setActive(true);
    }
  }, [open, conta]);

  function alterarSaldoInicial(v: string) {
    setSaldoInicial(v);
    if (!conta && !saldoAtualTocado) {
      setSaldoAtual(v);
    }
  }

  function alterarSaldoAtual(v: string) {
    setSaldoAtual(v);
    setSaldoAtualTocado(true);
  }

  async function salvar() {
    if (!name.trim() || !saldoInicial || !saldoAtual) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/financialaccounts/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: conta?.id ?? 0,
          name,
          initial_balance: saldoInicial,
          current_balance: saldoAtual,
          active,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar conta.");
        return;
      }
      toast.success(data.msg ?? "Conta salva.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar conta.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[440px] max-w-[calc(100%-2rem)] sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{conta ? "Editar conta" : "Nova conta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Caixa, Banco, Carteira" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Saldo inicial</Label>
              <MoneyInput value={saldoInicial} onChange={alterarSaldoInicial} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Saldo atual</Label>
              <MoneyInput value={saldoAtual} onChange={alterarSaldoAtual} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label className="text-sm">Conta ativa</Label>
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
