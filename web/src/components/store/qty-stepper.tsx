"use client";

import { Minus, Plus } from "lucide-react";
import { useStoreTheme } from "@/components/store/store-theme";

export function QtyStepper({
  value,
  onChange,
  min = 1,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  size?: "sm" | "md";
}) {
  const { brown } = useStoreTheme();
  const dim = size === "sm" ? "size-6.5" : "size-7";
  const iconSize = size === "sm" ? 12 : 14;
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
        onClick={() => onChange(value + 1)}
        className={`${dim} flex items-center justify-center rounded-full text-white`}
        style={{ background: brown }}
      >
        <Plus size={iconSize} />
      </button>
    </div>
  );
}
