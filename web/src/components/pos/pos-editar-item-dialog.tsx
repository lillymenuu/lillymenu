"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCartItem } from "@/lib/pos";

export function PosEditarItemDialog({
  item,
  onOpenChange,
  onSalvar,
}: {
  item: PosCartItem | null;
  onOpenChange: (v: boolean) => void;
  onSalvar: (rowKey: string, qtd: number, observacoes: string) => void;
}) {
  const [qtd, setQtd] = useState(1);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (item) {
      setQtd(item.qtd);
      setObservacoes(item.observacoes);
    }
  }, [item]);

  if (!item) return null;

  function salvar() {
    if (!item) return;
    onSalvar(item.rowKey, qtd, observacoes);
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-4 sm:max-w-sm" showCloseButton={false}>
        <DialogTitle className="sr-only">{item.nome}</DialogTitle>

        <div className="flex items-start gap-3">
          <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            {item.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imagem} alt={item.nome} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground/40">
                <ShoppingBag className="size-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="line-clamp-2 text-sm leading-tight font-semibold">{item.nome}</div>
            <div className="text-sm font-semibold text-emerald-600">{formatBRL(item.preco)}</div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
            aria-label="Fechar"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Observações do cliente"
          rows={2}
          className="w-full resize-none rounded-xl border-0 bg-muted/60 px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-full bg-muted px-1 py-1">
            <button
              type="button"
              onClick={() => setQtd((q) => Math.max(1, q - 1))}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-4 text-center text-sm font-semibold tabular-nums">{qtd}</span>
            <button
              type="button"
              disabled={item.estoque !== undefined && qtd >= item.estoque}
              onClick={() => setQtd((q) => (item.estoque !== undefined ? Math.min(q + 1, item.estoque) : q + 1))}
              className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={salvar}
            className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Editar · {formatBRL(item.preco * qtd)}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
