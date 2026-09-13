"use client";

import { Pencil, X, ShoppingBag } from "lucide-react";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCartItem } from "@/lib/pos";

export function PosCartList({
  itens,
  onEditar,
  onRemover,
}: {
  itens: PosCartItem[];
  onEditar: (item: PosCartItem) => void;
  onRemover: (rowKey: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="text-sm font-semibold">Resumo do pedido</div>
      {itens.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
          <ShoppingBag className="size-6 text-muted-foreground/40" />
          Nenhum item adicionado
        </div>
      ) : (
        <div className="divide-y rounded-xl border">
          {itens.map((item) => (
            <div key={item.rowKey} className="flex items-start justify-between gap-2 p-2.5">
              <div className="min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{item.qtd}x</span> {item.nome}
                </div>
                {item.observacoes && !item.observacoes.startsWith("[combo]") ? (
                  <div className="truncate text-xs text-muted-foreground">{item.observacoes}</div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">{formatBRL(item.preco * item.qtd)}</span>
                <button
                  type="button"
                  onClick={() => onEditar(item)}
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemover(item.rowKey)}
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
