"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PosCupomField({
  subtotal,
  taxaEntrega,
  tipoPedido,
  clienteId,
  cupom,
  onCupomChange,
}: {
  subtotal: number;
  taxaEntrega: number;
  tipoPedido: string;
  clienteId: number | null;
  cupom: { codigo: string; valor: number } | null;
  onCupomChange: (c: { codigo: string; valor: number } | null) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [validando, setValidando] = useState(false);

  async function validar() {
    const codigoLimpo = codigo.trim().toUpperCase();
    if (!codigoLimpo) return;
    setValidando(true);
    try {
      const res = await fetch("/api/pos/cupom-validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoLimpo, subtotal, tipo: tipoPedido, taxa: taxaEntrega, cliente_id: clienteId ?? 0 }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Cupom inválido.");
        return;
      }
      onCupomChange({ codigo: data.codigo, valor: data.valor });
      toast.success("Cupom aplicado.");
    } catch {
      toast.error("Erro ao validar cupom.");
    } finally {
      setValidando(false);
    }
  }

  if (cupom) {
    return (
      <div className="flex h-12 items-center justify-between rounded-xl border bg-primary/5 px-3.5">
        <span className="flex items-center gap-2 text-sm font-medium text-primary">
          <Tag className="size-4" /> {cupom.codigo}
        </span>
        <button
          type="button"
          onClick={() => onCupomChange(null)}
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Tag className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && validar()}
        onBlur={validar}
        placeholder="Selecione um cupom de desconto"
        disabled={validando}
        className="h-12 rounded-xl pl-10 text-sm uppercase placeholder:normal-case"
      />
    </div>
  );
}
