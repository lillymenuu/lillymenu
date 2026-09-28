"use client";

import { useEffect, useRef, useState } from "react";
import { Users, PiggyBank, Layers, Ticket, Percent, Gift, type LucideIcon } from "lucide-react";
import { cn } from "cn";

type Beneficio = { titulo: string; texto: string };

const ICONES_BENEFICIO: LucideIcon[] = [Users, PiggyBank, Layers, Ticket, Percent, Gift];

/** Grid de beneficios do clube — cards aparecem em cascata ao entrar na tela e reagem ao hover. */
export function LandingBeneficios({ titulo, beneficios }: { titulo: string; beneficios: Beneficio[] }) {
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

  if (beneficios.length === 0) return null;

  return (
    <div id="beneficios" className="mt-20 scroll-mt-20">
      <h3 className="text-center text-[24px] font-bold tracking-tight">{titulo}</h3>
      <div ref={ref} className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {beneficios.map((b, i) => {
          const Icone = ICONES_BENEFICIO[i % ICONES_BENEFICIO.length];
          return (
            <div
              key={b.titulo}
              className={cn(
                "flex flex-col gap-2 rounded-2xl bg-[#f9fafb] p-6 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)]",
                visivel ? "landing-card-reveal" : "opacity-0 translate-y-4"
              )}
              style={visivel ? { animationDelay: `${i * 90}ms` } : undefined}
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef2ff] text-[#2563eb]">
                <Icone className="size-4.5" />
              </span>
              <h4 className="text-[15px] font-bold">{b.titulo}</h4>
              <p className="text-[14.5px] leading-relaxed text-[#4b5563]">{b.texto}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
