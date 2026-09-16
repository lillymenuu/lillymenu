"use client";

import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCartItem } from "@/lib/store/types";

export function StoreCartSheet({
  open,
  onOpenChange,
  itens,
  subtotal,
  onAtualizarQtd,
  onRemover,
  onFinalizar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itens: StoreCartItem[];
  subtotal: number;
  onAtualizarQtd: (key: string, qtd: number) => void;
  onRemover: (key: string) => void;
  onFinalizar: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="border-b p-4">
          <DialogTitle>Seu carrinho</DialogTitle>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {itens.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <ShoppingBag size={28} />
              <p className="text-sm">Nenhum item adicionado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {itens.map((item) => {
                const obsExibivel = item.obs.startsWith("[combo]")
                  ? item.obs.replace(/^\[combo\]\n?/, "")
                  : item.obs;
                return (
                  <div key={item.key} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{item.nome}</div>
                        {obsExibivel && (
                          <div className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">{obsExibivel}</div>
                        )}
                        <div className="mt-1 text-sm font-medium text-foreground">{formatarPreco(item.precoUnit)}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemover(item.key)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => onAtualizarQtd(item.key, item.qtd - 1)}
                      >
                        <Minus size={12} />
                      </Button>
                      <span className="w-5 text-center text-sm">{item.qtd}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => onAtualizarQtd(item.key, item.qtd + 1)}
                      >
                        <Plus size={12} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {itens.length > 0 && (
          <div className="border-t p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground">{formatarPreco(subtotal)}</span>
            </div>
            <Button type="button" className="w-full" onClick={onFinalizar}>
              Continuar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
