"use client";

import { Pencil, ShoppingBag, Trash2 } from "lucide-react";
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
      <div className="text-xs font-semibold">Resumo do pedido</div>
      {itens.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
          <ShoppingBag className="size-6 text-muted-foreground/40" />
          Nenhum item adicionado
        </div>
      ) : (
        <div className="space-y-2.5">
          {itens.map((item) => (
            <div
              key={item.rowKey}
              role="button"
              tabIndex={0}
              onClick={() => onEditar(item)}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onEditar(item);
                }
              }}
              className="cursor-pointer rounded-2xl border bg-card p-3 transition-colors outline-none hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:border-primary/60"
            >
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{item.qtd}x</span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="truncate text-xs font-semibold text-foreground">{item.nome}</div>
                  {item.observacoes && !item.observacoes.startsWith("[combo]") ? (
                    <div className="truncate text-[11px] text-muted-foreground">{item.observacoes}</div>
                  ) : null}
                </div>
                <span className="shrink-0 pt-0.5 text-xs font-semibold tabular-nums">{formatBRL(item.preco * item.qtd)}</span>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditar(item);
                  }}
                  className="flex h-7 items-center gap-1.5 rounded-full border bg-muted/50 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Pencil className="size-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemover(item.rowKey);
                  }}
                  className="flex h-7 items-center gap-1.5 rounded-full bg-red-500/10 px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
