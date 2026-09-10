"use client";

import { useEffect, useState } from "react";
import { Search, Printer, Clock, Bike, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Pedido } from "@/lib/pedidos";
import { TIPO_LABELS, TIPO_CORES, formatBRL, formatHora } from "./constants";
import { cn } from "cn";

const TIPO_ICONS = { entrega: Bike, retirada: ShoppingBag, mesa: UtensilsCrossed } as const;

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function ResultadoSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <Skeleton className="h-5 w-full rounded-md" />
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-3.5 w-full" />
    </div>
  );
}

function ResultadoCard({ pedido, onClick }: { pedido: Pedido; onClick: () => void }) {
  const Icon = TIPO_ICONS[pedido.tipo as keyof typeof TIPO_ICONS] ?? ShoppingBag;
  const corTipo = TIPO_CORES[pedido.tipo] ?? "#6b7280";
  const formasPagamento =
    pedido.pagamentos?.length > 0
      ? pedido.pagamentos.map((p) => p.forma)
      : [pedido.forma_pagamento || "-"];
  const minutosDesdeCriacao = Math.floor(
    (Date.now() - new Date(pedido.criado_em.replace(" ", "T")).getTime()) / 60000
  );
  const atrasado = minutosDesdeCriacao >= 60;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-1.5 rounded-xl border bg-card p-2.5 text-left text-xs shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">Pedido #{pedido.codigo}</span>
        <div className="flex items-center gap-1.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-muted-foreground">
            <Printer size={11} />
          </span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-normal",
              atrasado ? "bg-destructive text-white" : "bg-muted text-muted-foreground"
            )}
          >
            <Clock size={10} />
            {formatHora(pedido.criado_em)}
          </span>
        </div>
      </div>

      <div
        className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-medium"
        style={{ color: corTipo }}
      >
        <Icon size={12} />
        {TIPO_LABELS[pedido.tipo] ?? pedido.tipo}
      </div>

      <div className="font-medium">{pedido.nome}</div>
      <div className="text-muted-foreground">{pedido.telefone}</div>

      <div className="flex items-center justify-between">
        <span className="font-normal text-muted-foreground">Total</span>
        <span className="font-medium">{formatBRL(Number(pedido.total))}</span>
      </div>
      <div className="flex items-start justify-between">
        <span className="font-normal text-muted-foreground">Pagamento</span>
        <div className="flex flex-col items-end">
          {formasPagamento.map((forma, i) => (
            <span key={i} className="font-normal capitalize">
              {forma}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

export function OrderSearchDialog({
  open,
  onOpenChange,
  onSelecionar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelecionar: (pedidoId: number) => void;
}) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Pedido[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (!open) {
      setTermo("");
      setResultados([]);
    }
  }, [open]);

  useEffect(() => {
    if (!termo.trim()) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ordermanager/buscar?q=${encodeURIComponent(termo.trim())}`);
        const data = await res.json();
        if (data.ok) setResultados(data.pedidos ?? []);
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [termo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar pedido</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input
            autoFocus
            className="pl-8"
            placeholder="Número do pedido, nome ou telefone do cliente"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>
        <div className="scrollbar-hidden max-h-[60vh] overflow-y-auto">
          {!termo.trim() && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Search size={22} />
              <p className="text-sm font-medium">Como buscar um pedido</p>
              <p className="max-w-64 text-xs">
                Digite o número do pedido, o nome do cliente ou o telefone pra encontrar pedidos
                rapidamente.
              </p>
            </div>
          )}
          {termo.trim() && buscando && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <ResultadoSkeleton key={i} />
              ))}
            </div>
          )}
          {termo.trim() && !buscando && resultados.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          )}
          {termo.trim() && !buscando && resultados.length > 0 && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {resultados.map((p) => (
                <ResultadoCard key={p.id} pedido={p} onClick={() => onSelecionar(p.id)} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
