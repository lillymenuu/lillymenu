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
      className="flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold">
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
            className="flex size-6 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted"
            aria-label="Imprimir"
          >
            <Printer size={11} />
          </button>
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            <Clock size={10} />
            {formatTempoRelativo(referencia)}
          </span>
        </div>
      </div>

      <span className="text-xs font-bold tracking-wide" style={{ color: corTipo }}>
        {TIPO_LABELS[pedido.tipo] ?? pedido.tipo?.toUpperCase()}
      </span>

      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{pedido.nome}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{pedido.telefone}</span>
      </div>

      {pedido.tipo === "entrega" && pedido.endereco_entrega && (
        <div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{pedido.endereco_entrega}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total</span>
        <span className="font-semibold">{formatBRL(pedido.total)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Pagamento</span>
        <span className="font-medium">{pagamentoTexto}</span>
      </div>

      {pedido.tipo === "entrega" &&
        (pedido.motoboy_nome ? (
          <div onClick={parar}>
            <div className="text-sm">
              <span className="text-muted-foreground">Entregador: </span>
              <span className="font-semibold">{pedido.motoboy_nome}</span>
            </div>
            <button
              type="button"
              onClick={onVincularMotoboy}
              className="text-xs font-medium text-primary hover:underline"
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
            className="text-left text-xs font-medium text-primary hover:underline"
          >
            Vincular entregador
          </button>
        ))}

      <div className="mt-1 flex items-center gap-1.5" onClick={parar}>
        {pedido.status === "pendente" ? (
          <>
            <Button variant="outline" className="flex-1 rounded-lg" onClick={onRecusar}>
              Recusar pedido
            </Button>
            <Button className="flex-1 rounded-lg" onClick={onAvancar}>
              Aceitar pedido
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
