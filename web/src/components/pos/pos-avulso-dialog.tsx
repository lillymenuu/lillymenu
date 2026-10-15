"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/produtos/money-input";
import type { PosCartItem } from "@/lib/pos";

export function PosAvulsoDialog({
  open,
  onOpenChange,
  onAdicionar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdicionar: (item: Omit<PosCartItem, "rowKey">) => void;
}) {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [qtd, setQtd] = useState(1);

  useEffect(() => {
    if (!open) return;
    setNome("");
    setPreco("");
    setObservacoes("");
    setQtd(1);
  }, [open]);

  function confirmar() {
    const nomeLimpo = nome.trim();
    const precoNum = Number(preco || 0);
    if (!nomeLimpo) {
      toast.error("Informe o nome do item.");
      return;
    }
    if (precoNum <= 0) {
      toast.error("Informe um preço válido.");
      return;
    }
    onAdicionar({
      produtoId: null,
      nome: nomeLimpo.toLowerCase().includes("avulso") ? nomeLimpo : `${nomeLimpo} - avulso`,
      qtd,
      preco: precoNum,
      observacoes: observacoes.trim(),
      usarPontos: false,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Item avulso</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Nome do item</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Taxa extra"
              autoFocus
              className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm placeholder:text-xs placeholder:text-muted-foreground/70"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Preço</Label>
            <MoneyInput value={preco} onChange={setPreco} className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Observações</Label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border-0 bg-muted/60 px-4 py-2.5 text-sm outline-none placeholder:text-xs placeholder:text-muted-foreground/70 focus-visible:ring-3 focus-visible:ring-primary/60"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-normal text-muted-foreground">Quantidade</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQtd((q) => Math.max(1, q - 1))}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-semibold">{qtd}</span>
              <button
                type="button"
                onClick={() => setQtd((q) => q + 1)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t-0 bg-transparent">
          <Button className="h-11 w-full rounded-full" onClick={confirmar}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
