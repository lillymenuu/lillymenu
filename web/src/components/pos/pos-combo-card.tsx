"use client";

import { Layers, Minus, Plus } from "lucide-react";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCombo } from "@/lib/pos";

export function PosComboCard({ combo, qtd, onAbrir }: { combo: PosCombo; qtd: number; onAbrir: (combo: PosCombo) => void }) {
  const precoExibido = combo.preco_promocional ?? combo.preco;
  const emPromo = combo.preco_promocional !== null;

  return (
    <div className="flex h-[246px] w-[182px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="relative h-[124px] shrink-0 bg-muted">
        {combo.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={combo.imagem} alt={combo.nome} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground/40">
            <Layers className="size-7" />
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          Combo
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden px-2 pt-1.5">
        <div className="line-clamp-2 text-[12.5px] leading-tight font-medium text-foreground">{combo.nome}</div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold">
            {combo.tipo_preco === "soma" ? "A partir de " : ""}
            {formatBRL(precoExibido)}
          </span>
          {emPromo ? <span className="text-[11px] text-muted-foreground line-through">{formatBRL(combo.preco)}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-center gap-2 p-1.5">
        <button
          type="button"
          disabled
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border text-muted-foreground opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums">{qtd}</span>
        <button
          type="button"
          onClick={() => onAbrir(combo)}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
