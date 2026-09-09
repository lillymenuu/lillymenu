"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import type { Categoria } from "@/lib/produtos";

export function ReordenarCategoriasDialog({
  open,
  onOpenChange,
  categorias,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [lista, setLista] = useState<Categoria[]>([]);
  const [arrastandoIdx, setArrastandoIdx] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) setLista(categorias);
  }, [open, categorias]);

  function onDrop(idxDestino: number) {
    if (arrastandoIdx === null || arrastandoIdx === idxDestino) return;
    setLista((prev) => {
      const copia = [...prev];
      const [item] = copia.splice(arrastandoIdx, 1);
      copia.splice(idxDestino, 0, item);
      return copia;
    });
    setArrastandoIdx(null);
  }

  async function salvar() {
    setSalvando(true);
    try {
      await fetch("/api/categorias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem: lista.map((c) => c.id) }),
      });
      onOpenChange(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader className="flex-row items-center justify-between pr-8">
          <DialogTitle>Reordenar</DialogTitle>
          <Button size="sm" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Clique para selecionar e arraste os itens para reordenar a ordem em que eles aparecerão no menu.
        </p>
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {lista.map((cat, idx) => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => setArrastandoIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(idx)}
              className={cn(
                "flex cursor-grab items-center gap-2 rounded-full border px-4 py-2.5 text-sm active:cursor-grabbing",
                arrastandoIdx === idx && "opacity-50"
              )}
            >
              <GripVertical size={14} className="text-muted-foreground" />
              <span>
                {idx + 1} - {cat.nome}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
