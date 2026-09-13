"use client";

import { useEffect, useState } from "react";
import { UserRound, UserPlus, Coins, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosClienteBusca, PosClienteStats } from "@/lib/pos";
import { PosClienteDialog } from "@/components/pos/pos-cliente-dialog";

export function PosClienteSection({
  cliente,
  onClienteChange,
  onStatsChange,
}: {
  cliente: PosClienteBusca | null;
  onClienteChange: (c: PosClienteBusca | null) => void;
  onStatsChange: (stats: PosClienteStats | null) => void;
}) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [stats, setStats] = useState<PosClienteStats | null>(null);
  const [carregandoStats, setCarregandoStats] = useState(false);

  useEffect(() => {
    if (!cliente) {
      setStats(null);
      onStatsChange(null);
      return;
    }
    setCarregandoStats(true);
    fetch(`/api/cliente/stats?id=${cliente.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setStats(data);
          onStatsChange(data);
        }
      })
      .catch(() => {})
      .finally(() => setCarregandoStats(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  return (
    <div className="space-y-2">
      {cliente ? (
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{cliente.nome}</div>
                <div className="text-xs text-muted-foreground">{cliente.telefone}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDialogAberto(true)}>
              Trocar
            </Button>
          </div>
          {!carregandoStats && stats ? (
            <div className="mt-2.5 grid grid-cols-2 gap-2 border-t pt-2.5">
              <div className="flex items-center gap-1.5 text-xs">
                <Coins className="size-3.5 text-amber-600" />
                <span className="text-muted-foreground">Cashback:</span>
                <span className="font-semibold">{formatBRL(stats.cashback ?? 0)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Gift className="size-3.5 text-primary" />
                <span className="text-muted-foreground">Pontos:</span>
                <span className="font-semibold">{stats.pontos ?? 0}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => setDialogAberto(true)}>
          <UserPlus className="size-4" /> Selecionar cliente
        </Button>
      )}

      <PosClienteDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onSelecionado={(c) => {
          onClienteChange(c);
        }}
      />
    </div>
  );
}
