"use client";

import { Clock, MapPin, Printer, Bike, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Pedido } from "@/lib/pedidos";
import { PROXIMA_ETAPA, TIPO_CORES, TIPO_LABELS, formatBRL, formatTempoRelativo } from "./constants";
import { cn } from "cn";

const TIPO_ICONS = { entrega: Bike, retirada: ShoppingBag, mesa: UtensilsCrossed } as const;

export function OrderCard({
  pedido,
  onAbrir,
  onAvancar,
  onRecusar,
  onVincularMotoboy,
  onDragStart,
  onDragEnd,
}: {
  pedido: Pedido;
  onAbrir: () => void;
  onAvancar: () => void;
  onRecusar: () => void;
  onVincularMotoboy: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const referencia = pedido.status_em || pedido.criado_em;
  const proxima = PROXIMA_ETAPA[pedido.status];
  const pagamentoTexto =
    pedido.pagamentos?.length > 0
      ? pedido.pagamentos.map((p) => p.forma).join(", ")
      : pedido.forma_pagamento || "-";
  const Icon = TIPO_ICONS[pedido.tipo as keyof typeof TIPO_ICONS] ?? ShoppingBag;
  const corTipo = TIPO_CORES[pedido.tipo] ?? "#6b7280";
  const finalizarEmVerde = pedido.status === "entrega";

  function parar(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onAbrir}
      className="flex cursor-pointer flex-col gap-1.5 rounded-xl border bg-card p-2.5 text-sm shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon size={14} className="shrink-0 text-muted-foreground" />
          Pedido #{pedido.codigo}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              parar(e);
              onAbrir();
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted"
            aria-label="Imprimir"
          >
            <Printer size={11} />
          </button>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-normal text-muted-foreground">
            <Clock size={10} />
            {formatTempoRelativo(referencia)}
          </span>
        </div>
      </div>

      <span className="text-center text-xs font-semibold tracking-wide" style={{ color: corTipo }}>
        {TIPO_LABELS[pedido.tipo] ?? pedido.tipo?.toUpperCase()}
      </span>

      <div className="flex items-baseline justify-center gap-2 text-center">
        <span className="truncate font-medium">{pedido.nome}</span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground">{pedido.telefone}</span>
      </div>

      {pedido.tipo === "entrega" && pedido.endereco_entrega && (
        <div className="flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{pedido.endereco_entrega}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="font-normal text-muted-foreground">Total</span>
        <span className="font-medium">{formatBRL(pedido.total)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-normal text-muted-foreground">Pagamento</span>
        <span className="font-normal">{pagamentoTexto}</span>
      </div>

      {pedido.tipo === "entrega" &&
        (pedido.motoboy_nome ? (
          <div className="text-center" onClick={parar}>
            <div className="text-sm">
              <span className="font-normal text-muted-foreground">Entregador: </span>
              <span className="font-medium">{pedido.motoboy_nome}</span>
            </div>
            <button
              type="button"
              onClick={onVincularMotoboy}
              className="text-xs font-normal text-primary hover:underline"
            >
              Alterar vínculo
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              parar(e);
              onVincularMotoboy();
            }}
            className="text-center text-xs font-normal text-primary hover:underline"
          >
            Vincular entregador
          </button>
        ))}

      <div className="mt-0.5 flex items-center gap-1.5" onClick={parar}>
        {pedido.status === "pendente" ? (
          <>
            <Button variant="outline" className="min-w-0 flex-1 rounded-lg px-1.5" onClick={onRecusar}>
              Recusar
            </Button>
            <Button className="min-w-0 flex-1 rounded-lg px-1.5" onClick={onAvancar}>
              Aceitar
            </Button>
          </>
        ) : (
          proxima && (
            <Button
              className={cn(
                "w-full rounded-lg",
                finalizarEmVerde && "bg-emerald-500 text-white hover:bg-emerald-600"
              )}
              onClick={onAvancar}
            >
              {proxima.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
