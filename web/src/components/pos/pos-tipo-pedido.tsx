"use client";

import { Bike, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PosTipoPedido } from "@/lib/pos";

export type PosEndereco = {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
  complemento: string;
};

const OPCOES: { valor: PosTipoPedido; label: string; icon: typeof Bike }[] = [
  { valor: "entrega", label: "Entrega", icon: Bike },
  { valor: "retirada", label: "Retirada", icon: ShoppingBag },
  { valor: "mesa", label: "Local", icon: UtensilsCrossed },
];

export function PosTipoPedido({
  tipo,
  onTipoChange,
  endereco,
  onEnderecoChange,
}: {
  tipo: PosTipoPedido;
  onTipoChange: (t: PosTipoPedido) => void;
  endereco: PosEndereco;
  onEnderecoChange: (e: PosEndereco) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-1.5">
        {OPCOES.map((op) => {
          const Icon = op.icon;
          const ativo = tipo === op.valor;
          return (
            <button
              key={op.valor}
              type="button"
              onClick={() => onTipoChange(op.valor)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-colors ${
                ativo ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className="size-4" />
              {op.label}
            </button>
          );
        })}
      </div>

      {tipo === "entrega" ? (
        <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-2.5">
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px]">Rua</Label>
            <Input
              className="h-8 text-xs"
              value={endereco.rua}
              onChange={(e) => onEnderecoChange({ ...endereco, rua: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Número</Label>
            <Input
              className="h-8 text-xs"
              value={endereco.numero}
              onChange={(e) => onEnderecoChange({ ...endereco, numero: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">CEP</Label>
            <Input className="h-8 text-xs" value={endereco.cep} onChange={(e) => onEnderecoChange({ ...endereco, cep: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Bairro</Label>
            <Input
              className="h-8 text-xs"
              value={endereco.bairro}
              onChange={(e) => onEnderecoChange({ ...endereco, bairro: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Cidade</Label>
            <Input
              className="h-8 text-xs"
              value={endereco.cidade}
              onChange={(e) => onEnderecoChange({ ...endereco, cidade: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px]">Complemento</Label>
            <Input
              className="h-8 text-xs"
              value={endereco.complemento}
              onChange={(e) => onEnderecoChange({ ...endereco, complemento: e.target.value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
