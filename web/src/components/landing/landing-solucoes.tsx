"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, ShoppingBag, Users, Wallet, BarChart3, type LucideIcon } from "lucide-react";
import { cn } from "cn";

export type Solucao = { titulo: string; texto: string; imagem: string };

const TAGS = ["PDV", "DELIVERY", "CLIENTES", "FINANCEIRO", "RELATÓRIOS"];
const ICONES: LucideIcon[] = [Monitor, ShoppingBag, Users, Wallet, BarChart3];

const MESAS = [
  { mesa: "Mesa 2", status: "Ocupada", cor: "bg-amber-100 text-amber-700" },
  { mesa: "Mesa 4", status: "Aguardando pedido", cor: "bg-[var(--landing-accent-soft)] text-[var(--landing-accent)]" },
  { mesa: "Balcão 1", status: "Fechando conta", cor: "bg-emerald-100 text-emerald-700" },
];

const CARD_HOVER =
  "transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[rgb(var(--landing-accent-rgb)/0.35)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.1)]";

export function LandingSolucoes({ titulo, itens }: { titulo: string; itens: Solucao[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setVisivel(true), 0);
      return () => clearTimeout(t);
    }
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (itens.length === 0) return null;
  const [primeira, ...resto] = itens;

  return (
    <section id="solucoes" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-16 sm:px-6 md:py-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-xs font-bold tracking-widest text-[var(--landing-accent)] uppercase">Recursos</span>
        <h2 className="max-w-xl text-[30px] leading-[1.2] font-extrabold tracking-tight">{titulo}</h2>
      </div>

      <div ref={ref} className="mt-12 grid gap-5 sm:grid-cols-2">
        <div
          className={cn(
            "flex flex-col gap-5 rounded-2xl border border-[#e5e7eb] bg-white p-6 sm:col-span-2 sm:flex-row sm:items-center",
            CARD_HOVER,
            visivel ? "landing-card-reveal" : "opacity-0 translate-y-4"
          )}
          style={visivel ? { animationDelay: "0ms" } : undefined}
        >
          <div className="flex flex-1 flex-col gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--landing-accent-soft)] text-[var(--landing-accent)]">
              <Monitor className="size-4.5" />
            </span>
            <span className="text-xs font-bold tracking-wide text-[#6b7280] uppercase">{TAGS[0]}</span>
            <h3 className="text-lg font-bold">{primeira.titulo}</h3>
            <p className="text-sm leading-relaxed text-[#4b5563]">{primeira.texto}</p>
          </div>
          <div className="flex w-full flex-col gap-2 rounded-xl bg-[#f9fafb] p-4 sm:w-72">
            {MESAS.map((m) => (
              <div key={m.mesa} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm">
                <span className="font-semibold">{m.mesa}</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${m.cor}`}>{m.status}</span>
              </div>
            ))}
          </div>
        </div>

        {resto.map((item, i) => {
          const Icone = ICONES[(i + 1) % ICONES.length];
          return (
            <div
              key={item.titulo}
              className={cn(
                "flex flex-col gap-2 rounded-2xl border border-[#e5e7eb] bg-white p-6",
                CARD_HOVER,
                visivel ? "landing-card-reveal" : "opacity-0 translate-y-4"
              )}
              style={visivel ? { animationDelay: `${(i + 1) * 100}ms` } : undefined}
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--landing-accent-soft)] text-[var(--landing-accent)]">
                <Icone className="size-4.5" />
              </span>
              <span className="text-xs font-bold tracking-wide text-[#6b7280] uppercase">{TAGS[(i + 1) % TAGS.length]}</span>
              <h3 className="text-lg font-bold">{item.titulo}</h3>
              <p className="text-sm leading-relaxed text-[#4b5563]">{item.texto}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
