"use client";

import { X } from "lucide-react";
import { WL_STATUS_LABEL } from "@/lib/whatslilly";
import type { WlPedidoResumo } from "@/lib/whatslilly";
import { cn } from "cn";

const STATUS_BADGE: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  aceito: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  preparando: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  entrega: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  finalizado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function formatarMoeda(v: number): string {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function WlPedidosDrawer({
  open,
  onClose,
  pedidos,
}: {
  open: boolean;
  onClose: () => void;
  pedidos: WlPedidoResumo[];
}) {
  return (
    <div
      className={cn(
        "absolute top-0 right-0 z-20 flex h-full w-[280px] max-w-full flex-col border-l bg-background shadow-lg transition-transform duration-200",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex items-center justify-between border-b p-3">
        <span className="text-sm font-semibold">Pedidos do cliente</span>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {pedidos.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</div>
        ) : (
          pedidos.map((p) => (
            <div key={p.id} className="rounded-lg border p-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">#{p.id}</span>
                <span className="font-medium">{formatarMoeda(p.total)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{p.criado_fmt}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_BADGE[p.status] ?? "bg-muted text-muted-foreground")}>
                  {WL_STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
