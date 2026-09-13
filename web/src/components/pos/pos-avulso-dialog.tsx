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
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Item avulso</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do item</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Taxa extra" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Preço</Label>
            <MoneyInput value={preco} onChange={setPreco} />
          </div>
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
          <Button className="w-full" onClick={confirmar}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
