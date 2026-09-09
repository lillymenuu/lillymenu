"use client";

import { Clock, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Pedido } from "@/lib/pedidos";
import { PROXIMA_ETAPA, TIPO_LABELS, formatBRL, formatTempoRelativo } from "./constants";
import { cn } from "cn";

export function OrderCard({
  pedido,
  onAbrir,
  onAvancar,
  onRecusar,
  onDragStart,
  onDragEnd,
}: {
  pedido: Pedido;
  onAbrir: () => void;
  onAvancar: () => void;
  onRecusar: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const referencia = pedido.status_em || pedido.criado_em;
  const minutos = referencia
    ? Math.floor((Date.now() - new Date(referencia.replace(" ", "T")).getTime()) / 60000)
    : 0;
  const atrasado = minutos >= 30;
  const proxima = PROXIMA_ETAPA[pedido.status];
  const pagamentoTexto =
    pedido.pagamentos?.length > 0
      ? pedido.pagamentos.map((p) => p.forma).join(", ")
      : pedido.forma_pagamento || "-";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onAbrir}
      className="flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">#{pedido.codigo}</span>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
            atrasado ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          )}
        >
          <Clock size={10} />
          {formatTempoRelativo(referencia)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[10px]">
          {TIPO_LABELS[pedido.tipo] ?? pedido.tipo?.toUpperCase()}
        </Badge>
        {(pedido.origem === "loja" || pedido.origem === "online" || pedido.origem === "site") && (
          <Badge variant="secondary" className="text-[10px]">
            Pedido feito pela loja
          </Badge>
        )}
      </div>

      {pedido.agendamento && (
        <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700">
          <Clock size={11} />
          Agendado: {pedido.agendamento}
        </div>
      )}

      <div className="min-w-0">
        <div className="truncate font-medium">{pedido.nome}</div>
        <div className="truncate text-xs text-muted-foreground">{pedido.telefone}</div>
      </div>

      {pedido.tipo === "entrega" && pedido.endereco_entrega && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin size={12} className="mt-0.5 shrink-0" />
          <span className="truncate">{pedido.endereco_entrega}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{pagamentoTexto}</span>
        <span className="font-semibold">{formatBRL(pedido.total)}</span>
      </div>

      {pedido.tipo === "entrega" && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Truck size={11} />
          {pedido.motoboy_nome ? (
            <span className="truncate">{pedido.motoboy_nome}</span>
          ) : (
            <span className="italic">sem motoboy vinculado</span>
          )}
        </div>
      )}

      <div className="mt-1 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {pedido.status === "pendente" ? (
          <>
            <Button size="sm" className="flex-1" onClick={onAvancar}>
              Aceitar
            </Button>
            <Button size="sm" variant="outline" onClick={onRecusar}>
              Recusar
            </Button>
          </>
        ) : (
          proxima && (
            <Button size="sm" variant="outline" className="w-full" onClick={onAvancar}>
              {proxima.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
