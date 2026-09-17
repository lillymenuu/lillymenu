"use client";

import { Minus, Plus } from "lucide-react";
import { useStoreTheme } from "@/components/store/store-theme";

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  /** Limite superior (normalmente o estoque disponivel). Sem limite se omitido. */
  max?: number;
  size?: "sm" | "md";
}) {
  const { brown } = useStoreTheme();
  const dim = size === "sm" ? "size-6.5" : "size-7";
  const iconSize = size === "sm" ? 12 : 14;
  const atingiuMax = max !== undefined && value >= max;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`${dim} flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 transition-opacity disabled:opacity-40`}
      >
        <Minus size={iconSize} />
      </button>
      <span className="w-5 text-center text-sm font-bold text-neutral-900">{value}</span>
      <button
        type="button"
        disabled={atingiuMax}
        onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        className={`${dim} flex items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40`}
        style={{ background: brown }}
      >
        <Plus size={iconSize} />
      </button>
    </div>
  );
}
