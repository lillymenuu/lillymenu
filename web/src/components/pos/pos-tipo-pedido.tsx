"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PosTipoPedido as PosTipoPedidoValor } from "@/lib/pos";

export type PosEndereco = {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
  complemento: string;
};

const LABELS: Record<PosTipoPedidoValor, string> = {
  entrega: "Entrega",
  retirada: "Retirada",
  mesa: "Consumo local",
};

export function PosTipoPedido({ tipo, onTipoChange }: { tipo: PosTipoPedidoValor; onTipoChange: (t: PosTipoPedidoValor) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Tipo do pedido</label>
      <Select value={tipo} onValueChange={(v) => v && onTipoChange(v as PosTipoPedidoValor)}>
        <SelectTrigger className="h-12 w-full rounded-xl text-sm">
          <SelectValue>{() => LABELS[tipo]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="entrega">Entrega</SelectItem>
          <SelectItem value="retirada">Retirada</SelectItem>
          <SelectItem value="mesa">Consumo local</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
