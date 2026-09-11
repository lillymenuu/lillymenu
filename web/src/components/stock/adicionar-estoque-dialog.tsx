"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EstoqueItem } from "@/lib/estoque";
import { cn } from "cn";

export function AdicionarEstoqueDialog({
  open,
  onOpenChange,
  itens,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itens: EstoqueItem[];
  onConfirmar: (produtoId: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setBusca("");
      setSelecionadoId(null);
    }
  }, [open]);

  const semEstoque = useMemo(() => itens.filter((i) => i.quantidade <= 0), [itens]);
  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return semEstoque;
    return semEstoque.filter((i) => i.nome.toLowerCase().includes(termo));
  }, [semEstoque, busca]);

  function confirmar() {
    if (!selecionadoId) return;
    onConfirmar(selecionadoId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolha o item para criação de estoque</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input
            className="pl-8"
            placeholder="Pesquise pelo nome do produto"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {filtrados.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum produto sem estoque.</p>
          )}
          {filtrados.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelecionadoId(item.id)}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                selecionadoId === item.id && "bg-primary/10 font-medium text-primary"
              )}
            >
              {item.nome}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={confirmar} disabled={!selecionadoId}>
            Adicionar novo item de estoque
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
