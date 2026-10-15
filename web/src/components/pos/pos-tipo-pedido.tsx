"use client";

import { FastForward, Bike, ShoppingBasket, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import type { PosTipoPedido as PosTipoPedidoValor } from "@/lib/pos";

export type PosEndereco = {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
  complemento: string;
};

const OPCOES: { valor: PosTipoPedidoValor; label: string; icon: LucideIcon }[] = [
  { valor: "venda_rapida", label: "Venda rápida", icon: FastForward },
  { valor: "entrega", label: "Entrega", icon: Bike },
  { valor: "retirada", label: "Retirada", icon: ShoppingBasket },
  { valor: "mesa", label: "Comer no local", icon: UtensilsCrossed },
];

export function PosTipoPedido({
  tipo,
  onTipoChange,
}: {
  tipo: PosTipoPedidoValor | null;
  onTipoChange: (t: PosTipoPedidoValor) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Tipo do pedido</label>
      <div className="grid grid-cols-4 gap-1.5">
        {OPCOES.map((opcao) => {
          const ativo = tipo === opcao.valor;
          const Icon = opcao.icon;
          return (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => onTipoChange(opcao.valor)}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-medium transition-colors",
                ativo ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:border-primary/40 hover:bg-muted"
              )}
            >
              <Icon size={18} />
              {opcao.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
