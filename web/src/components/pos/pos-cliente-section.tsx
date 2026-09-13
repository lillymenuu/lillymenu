"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { PosClienteBusca, PosClienteStats } from "@/lib/pos";
import { PosClienteDialog } from "@/components/pos/pos-cliente-dialog";
import { PosInfoCard } from "@/components/pos/pos-info-card";

export function PosClienteSection({
  cliente,
  onClienteChange,
  onStatsChange,
  cashbackAtivo,
  onCashbackAtivoChange,
}: {
  cliente: PosClienteBusca | null;
  onClienteChange: (c: PosClienteBusca | null) => void;
  onStatsChange: (stats: PosClienteStats | null) => void;
  cashbackAtivo: boolean;
  onCashbackAtivoChange: (v: boolean) => void;
}) {
  const [dialogAberto, setDialogAberto] = useState(false);

  useEffect(() => {
    if (!cliente) {
      onStatsChange(null);
      return;
    }
    fetch(`/api/cliente/stats?id=${cliente.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) onStatsChange(data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  return (
    <>
      {cliente ? (
        <PosInfoCard onLimpar={() => onClienteChange(null)} onEditar={() => setDialogAberto(true)}>
          <div className="text-sm font-semibold">
            {cliente.nome} <span className="font-normal text-muted-foreground">- {cliente.telefone}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cashback nesta compra?</span>
            <Switch checked={cashbackAtivo} onCheckedChange={onCashbackAtivoChange} />
          </div>
        </PosInfoCard>
      ) : (
        <button
          type="button"
          onClick={() => setDialogAberto(true)}
          className="flex w-full items-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
        >
          <UserPlus className="size-4" /> Selecionar cliente
        </button>
      )}

      <PosClienteDialog open={dialogAberto} onOpenChange={setDialogAberto} onSelecionado={(c) => onClienteChange(c)} />
    </>
  );
}
