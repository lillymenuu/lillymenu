"use client";

import { Check } from "lucide-react";

const LABELS: Record<string, string> = {
  dados: "Contato",
  entrega: "Entrega",
  pagamento: "Pagamento",
  resumo: "Resumo",
};

export function CheckoutStepper({ etapas, atual }: { etapas: string[]; atual: string }) {
  const idxAtual = etapas.indexOf(atual);
  return (
    <div className="flex items-start px-3 pt-2.5 pb-1.5">
      {etapas.map((etapa, i) => {
        const done = i < idxAtual;
        const active = i === idxAtual;
        return (
          <div key={etapa} className="flex flex-1 items-center last:flex-none">
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <div
                className="relative flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[.68rem] transition-transform"
                style={
                  done || active
                    ? {
                        background: "linear-gradient(135deg,#9061f9,#6d28d9)",
                        borderColor: "transparent",
                        color: "#fff",
                        transform: active ? "scale(1.15)" : undefined,
                        boxShadow: active ? "0 4px 12px rgba(109,40,217,.4)" : "0 3px 8px rgba(109,40,217,.35)",
                      }
                    : { background: "#fff", borderColor: "#e3e0f2", color: "#c3bedb" }
                }
              >
                {done ? <Check size={12} /> : active ? <span className="size-1.5 rounded-full bg-white" /> : null}
              </div>
              <span
                className="mt-1.5 max-w-14 text-center text-[.58rem] leading-tight"
                style={active ? { color: "#6d28d9", fontWeight: 800 } : { color: done ? "#9c94bb" : "#bbb" }}
              >
                {LABELS[etapa]}
              </span>
            </div>
            {i < etapas.length - 1 && (
              <div className="mt-[11px] h-0.5 flex-1 overflow-hidden rounded bg-[#ece9f7]">
                <div
                  className="h-full rounded transition-transform duration-500"
                  style={{
                    background: "linear-gradient(90deg,#9061f9,#6d28d9)",
                    transform: i < idxAtual ? "scaleX(1)" : "scaleX(0)",
                    transformOrigin: "left",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
