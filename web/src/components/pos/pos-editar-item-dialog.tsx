"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{item.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Quantidade</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="size-8" onClick={() => setQtd((q) => Math.max(1, q - 1))}>
                <Minus className="size-3.5" />
              </Button>
              <span className="w-6 text-center text-sm font-semibold">{qtd}</span>
              <Button variant="outline" size="icon" className="size-8" onClick={() => setQtd((q) => q + 1)}>
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            onClick={() => {
              onSalvar(item.rowKey, qtd, observacoes);
              onOpenChange(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
