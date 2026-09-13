"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/produtos/money-input";
import { Label } from "@/components/ui/label";

export function PosCaixaGate({ onAberto }: { onAberto: () => void }) {
  const [saldoInicial, setSaldoInicial] = useState("");
  const [abrindo, setAbrindo] = useState(false);

  async function abrirCaixa() {
    setAbrindo(true);
    try {
      const res = await fetch("/api/cashcontrol/abrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldo_inicial: Number(saldoInicial || 0) }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao abrir o caixa.");
        return;
      }
      toast.success("Caixa aberto.");
      onAberto();
    } catch {
      toast.error("Erro ao abrir o caixa.");
    } finally {
      setAbrindo(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Lock className="size-6" />
      </div>
      <div>
        <div className="text-base font-semibold">Caixa fechado</div>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">Abra o caixa do dia para começar a lançar pedidos no balcão.</p>
      </div>
      <div className="w-full max-w-[200px] space-y-1.5 text-left">
        <Label className="text-xs">Saldo inicial</Label>
        <MoneyInput value={saldoInicial} onChange={setSaldoInicial} />
      </div>
      <Button onClick={abrirCaixa} disabled={abrindo}>
        {abrindo ? "Abrindo..." : "Abrir caixa"}
      </Button>
    </div>
  );
}
