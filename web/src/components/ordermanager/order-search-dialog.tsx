"use client";

import { useEffect, useState } from "react";
import { Search, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Pedido } from "@/lib/pedidos";

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export function OrderSearchDialog({
  open,
  onOpenChange,
  onSelecionar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelecionar: (pedidoId: number) => void;
}) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Pedido[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (!open) {
      setTermo("");
      setResultados([]);
    }
  }, [open]);

  useEffect(() => {
    if (!termo.trim()) {
      setResultados([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/ordermanager/buscar?q=${encodeURIComponent(termo.trim())}`);
        const data = await res.json();
        if (data.ok) setResultados(data.pedidos ?? []);
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [termo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buscar pedido</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input
            autoFocus
            className="pl-8"
            placeholder="Número do pedido, nome ou telefone do cliente"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {!termo.trim() && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Search size={22} />
              <p className="text-sm font-medium">Como buscar um pedido</p>
              <p className="max-w-64 text-xs">
                Digite o número do pedido, o nome do cliente ou o telefone pra encontrar pedidos
                rapidamente.
              </p>
            </div>
          )}
          {termo.trim() && !buscando && resultados.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          )}
          {resultados.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelecionar(p.id)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Receipt size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  #{p.codigo} · {p.nome}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{p.telefone}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                {formatBRL(Number(p.total))}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
