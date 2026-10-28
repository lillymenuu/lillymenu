"use client";

import { Clock, Copy, MapPin, Printer, Bike, Receipt, ShoppingBag, UtensilsCrossed, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Pedido } from "@/lib/pedidos";
import { PROXIMA_ETAPA, TIPO_CORES, TIPO_LABELS, formatBRL, formatHora } from "./constants";
import { cn } from "cn";

const TIPO_ICONS = { entrega: Bike, retirada: ShoppingBag, mesa: UtensilsCrossed } as const;

/* O endereco vem num texto so, em dois formatos conforme a origem do pedido:
   - Loja: "Rua X, 123, Complemento, Bairro, Cidade/UF, CEP 00000-000" (complemento opcional)
   - PDV: "Rua X, 123 | Bairro: Y | Cidade: Z | CEP: ... | Complemento: ..."
   Separa em rua/numero/complemento (linha principal) e bairro · cidade · CEP. */
function dividirEndereco(texto: string): { principal: string; secundario: string } {
  const limpo = texto.replace(/\s*\|?\s*Agendamento:.*$/i, "").trim();

  if (limpo.includes("|")) {
    const principal: string[] = [];
    const secundario: string[] = [];
    for (const seg of limpo.split("|").map((s) => s.trim()).filter(Boolean)) {
      const m = seg.match(/^(bairro|cidade|cep|complemento):\s*(.*)$/i);
      if (!m) principal.push(seg);
      else if (m[1].toLowerCase() === "complemento") principal.push(m[2]);
      else secundario.push(m[2]);
    }
    return { principal: principal.filter(Boolean).join(" – "), secundario: secundario.filter(Boolean).join(" · ") };
  }

  const partes = limpo.split(",").map((s) => s.trim()).filter(Boolean);
  const iCidade = partes.findLastIndex((p) => p.includes("/"));
  if (iCidade < 3) return { principal: limpo, secundario: "" };

  const iBairro = iCidade - 1;
  const ruaNumero = partes.slice(0, 2).join(", ");
  const complemento = partes.slice(2, iBairro).join(", ");
  const secundario = [partes[iBairro], ...partes.slice(iCidade).map((p) => p.replace(/^CEP\s*/i, ""))];
  return {
    principal: [ruaNumero, complemento].filter(Boolean).join(" – "),
    secundario: secundario.filter(Boolean).join(" · "),
  };
}

export function OrderCard({
  pedido,
  onAbrir,
  onImprimir,
  onAvancar,
  onRecusar,
  onVincularMotoboy,
  onDragStart,
  onDragEnd,
}: {
  pedido: Pedido;
  onAbrir: () => void;
  onImprimir: () => void;
  onAvancar: () => void;
  onRecusar: () => void;
  onVincularMotoboy: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const proxima = PROXIMA_ETAPA[pedido.status];
  const minutosDesdeCriacao = Math.floor(
    (Date.now() - new Date(pedido.criado_em.replace(" ", "T")).getTime()) / 60000
  );
  const atrasado = minutosDesdeCriacao >= 60;
  const formasPagamento =
    pedido.pagamentos?.length > 0
      ? pedido.pagamentos.map((p) => p.forma)
      : [pedido.forma_pagamento || "-"];
  const Icon = TIPO_ICONS[pedido.tipo as keyof typeof TIPO_ICONS] ?? ShoppingBag;
  const corTipo = TIPO_CORES[pedido.tipo] ?? "#6b7280";
  const finalizarEmVerde = pedido.status === "entrega";
  const endereco =
    pedido.tipo === "entrega" && pedido.endereco_entrega ? dividirEndereco(pedido.endereco_entrega) : null;

  function parar(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function copiarEndereco(e: React.MouseEvent) {
    parar(e);
    if (!pedido.endereco_entrega) return;
    navigator.clipboard
      ?.writeText(pedido.endereco_entrega)
      .then(() => toast.success("Endereço copiado."))
      .catch(() => toast.error("Não foi possível copiar o endereço."));
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onAbrir}
      className={cn(
        "flex cursor-pointer flex-col gap-1.5 rounded-xl border bg-card p-2.5 text-sm shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        pedido.mesa_conta_solicitada_em && "border-2 border-destructive"
      )}
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
              onImprimir();
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted"
            aria-label="Imprimir"
          >
            <Printer size={11} />
          </button>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-normal",
              atrasado ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
            )}
          >
            <Clock size={10} />
            {formatHora(pedido.criado_em)}
          </span>
        </div>
      </div>

      <span className="text-center text-xs font-semibold tracking-wide" style={{ color: corTipo }}>
        {TIPO_LABELS[pedido.tipo] ?? pedido.tipo?.toUpperCase()}
      </span>

      {pedido.agendamento && (
        <span className="mx-auto flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          <CalendarClock size={10} /> Agendado
        </span>
      )}

      <div className="flex items-baseline justify-center gap-2 text-center">
        <span className="truncate font-medium">{pedido.nome}</span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground">{pedido.telefone}</span>
      </div>

      {pedido.mesa_nome && (
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <UtensilsCrossed size={11} className="shrink-0" />
          {pedido.mesa_nome}
        </div>
      )}

      {pedido.mesa_conta_solicitada_em && (
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive">
          <Receipt size={12} className="shrink-0" />
          Conta solicitada
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="font-normal text-muted-foreground">Total</span>
        <span className="font-medium">{formatBRL(pedido.total)}</span>
      </div>
      <div className="flex items-start justify-between text-sm">
        <span className="font-normal text-muted-foreground">Pagamento</span>
        <div className="flex flex-col items-end">
          {formasPagamento.map((forma, i) => (
            <span key={i} className="font-normal capitalize">
              {forma}
            </span>
          ))}
        </div>
      </div>

      {endereco && (
        <div className="flex flex-col gap-1 border-y border-dashed py-2">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin size={12} className="shrink-0" />
              Endereço de entrega
            </span>
            <button
              type="button"
              onClick={copiarEndereco}
              className="flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted hover:text-foreground"
              aria-label="Copiar endereço"
            >
              <Copy size={11} />
              Copiar
            </button>
          </div>
          <span className="font-medium leading-snug break-words">{endereco.principal}</span>
          {endereco.secundario && (
            <span className="text-xs text-muted-foreground">{endereco.secundario}</span>
          )}
        </div>
      )}

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
            <Button variant="outline" className="min-w-0 flex-1 rounded-full px-1.5" onClick={onRecusar}>
              Recusar
            </Button>
            <Button className="min-w-0 flex-1 rounded-full px-1.5" onClick={onAvancar}>
              Aceitar
            </Button>
          </>
        ) : (
          proxima && (
            <Button
              className={cn(
                "w-full rounded-full",
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
