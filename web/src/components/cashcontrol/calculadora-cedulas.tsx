"use client";

import { formatBRL } from "@/components/ordermanager/constants";

/** Cedulas e moedas da contagem, em centavos (evita erro de arredondamento na soma). */
export const CEDULAS_CENTAVOS = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 25, 10, 5] as const;

export type ContagemCedulas = Record<number, string>;

/** Total da contagem em reais, com 2 casas ("65.25"). */
export function totalContagem(contagem: ContagemCedulas): string {
  const centavos = CEDULAS_CENTAVOS.reduce((soma, c) => soma + c * (parseInt(contagem[c] || "0", 10) || 0), 0);
  return (centavos / 100).toFixed(2);
}

/** Grade de cedulas/moedas: o operador digita quantas tem de cada uma. */
export function CalculadoraCedulas({
  contagem,
  onChange,
}: {
  contagem: ContagemCedulas;
  onChange: (c: ContagemCedulas) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-3 sm:grid-cols-6">
      {CEDULAS_CENTAVOS.map((c) => (
        <div key={c} className="flex flex-col gap-1">
          <label htmlFor={`cedula-${c}`} className="text-xs font-semibold text-foreground">
            {formatBRL(c / 100)}
          </label>
          <input
            id={`cedula-${c}`}
            type="text"
            inputMode="numeric"
            value={contagem[c] ?? ""}
            onChange={(e) => onChange({ ...contagem, [c]: e.target.value.replace(/\D/g, "").slice(0, 5) })}
            onFocus={(e) => e.target.select()}
            className="h-10 w-full min-w-0 rounded-xl border bg-background px-3 text-sm tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-primary/60"
          />
        </div>
      ))}
    </div>
  );
}
