"use client";

import { Plus, Layers } from "lucide-react";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCombo } from "@/lib/pos";

export function PosComboCard({ combo, onAbrir }: { combo: PosCombo; onAbrir: (combo: PosCombo) => void }) {
  const precoExibido = combo.preco_promocional ?? combo.preco;
  const emPromo = combo.preco_promocional !== null;

  return (
    <button
      type="button"
      onClick={() => onAbrir(combo)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted">
        {combo.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={combo.imagem} alt={combo.nome} className="size-full object-cover" />
        ) : (
          <Layers className="size-8 text-muted-foreground/40" />
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
          <Layers className="size-3" /> Combo
        </span>
        <div className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          <Plus className="size-4" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <div className="line-clamp-2 text-xs font-medium leading-snug">{combo.nome}</div>
        <div className="mt-auto flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-foreground">
            {combo.tipo_preco === "soma" ? "A partir de " : ""}
            {formatBRL(precoExibido)}
          </span>
          {emPromo ? <span className="text-[11px] text-muted-foreground line-through">{formatBRL(combo.preco)}</span> : null}
        </div>
      </div>
    </button>
  );
}
