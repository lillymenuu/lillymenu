"use client";

import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCartItem } from "@/lib/pos";

export function PosCartList({
  itens,
  onAlterarQtd,
  onRemover,
}: {
  itens: PosCartItem[];
  onAlterarQtd: (rowKey: string, qtd: number) => void;
  onRemover: (rowKey: string) => void;
}) {
  if (itens.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <ShoppingBag className="size-8 text-muted-foreground/40" />
        Nenhum item adicionado
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
      {itens.map((item) => (
        <div key={item.rowKey} className="flex items-start gap-2 rounded-xl border bg-card p-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{item.nome}</div>
            {item.observacoes && !item.observacoes.startsWith("[combo]") ? (
              <div className="truncate text-xs text-muted-foreground">{item.observacoes}</div>
            ) : null}
            <div className="mt-1 flex items-center gap-2">
              <Button variant="outline" size="icon" className="size-6" onClick={() => onAlterarQtd(item.rowKey, item.qtd - 1)}>
                <Minus className="size-3" />
              </Button>
              <span className="w-5 text-center text-xs font-semibold">{item.qtd}</span>
              <Button variant="outline" size="icon" className="size-6" onClick={() => onAlterarQtd(item.rowKey, item.qtd + 1)}>
                <Plus className="size-3" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-sm font-semibold tabular-nums">{formatBRL(item.preco * item.qtd)}</span>
            <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive" onClick={() => onRemover(item.rowKey)}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
