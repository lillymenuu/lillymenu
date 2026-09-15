"use client";

import { AlertTriangle, Check } from "lucide-react";
import type { WlMensagem } from "@/lib/whatslilly";
import { cn } from "cn";

function parseNegrito(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*([^*\r\n]+)\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br>");
}

export function WlMensagemBubble({
  mensagem,
  selecionavel,
  selecionada,
  onToggleSelecao,
}: {
  mensagem: WlMensagem;
  selecionavel: boolean;
  selecionada: boolean;
  onToggleSelecao: () => void;
}) {
  const isSaida = mensagem.direcao === "saida";
  const isPedido = mensagem.tipo === "pedido";

  return (
    <div
      className={cn(
        "flex",
        isSaida ? "justify-end" : "justify-start",
        selecionavel && "cursor-pointer"
      )}
      onClick={selecionavel ? onToggleSelecao : undefined}
    >
      <div className="flex max-w-[75%] items-start gap-1.5">
        {selecionavel && (
          <div
            className={cn(
              "mt-2 flex size-4 shrink-0 items-center justify-center rounded-full border",
              selecionada ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
            )}
          >
            {selecionada && <Check className="size-2.5" />}
          </div>
        )}
        <div>
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
              isPedido
                ? "border border-emerald-500/30 bg-emerald-500/10"
                : isSaida
                  ? "bg-primary/15"
                  : "border bg-muted/60",
              mensagem.falhou && "opacity-70"
            )}
            dangerouslySetInnerHTML={{ __html: parseNegrito(mensagem.mensagem) }}
          />
          <div className={cn("mt-0.5 text-[10px] text-muted-foreground", isSaida ? "text-right" : "text-left")}>
            {mensagem.hora}
          </div>
          {mensagem.falhou && (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-destructive">
              <AlertTriangle className="size-3" /> Não entregue ao cliente
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
