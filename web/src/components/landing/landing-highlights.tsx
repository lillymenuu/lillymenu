"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

const DESTAQUES = [
  { titulo: "Tudo em um só sistema", texto: "PDV, delivery, financeiro e estoque." },
  { titulo: "Delivery sem comissão", texto: "Cardápio e entrega são da sua loja." },
  { titulo: "30 dias grátis", texto: "Teste sem cartão de crédito." },
  { titulo: "Suporte todos os dias", texto: "Ajuda pra configurar tudo." },
];

export function LandingHighlights() {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="bg-white">
      <div ref={ref} className="mx-auto grid max-w-[1180px] grid-cols-2 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {DESTAQUES.map((d, i) => (
          <div
            key={d.titulo}
            className={cn("flex flex-col items-center gap-1 text-center", visivel ? "landing-card-reveal" : "opacity-0 translate-y-4")}
            style={visivel ? { animationDelay: `${i * 90}ms` } : undefined}
          >
            <span className="text-xl font-extrabold text-[#2563eb] sm:text-2xl">{d.titulo}</span>
            <span className="text-xs font-semibold tracking-wide text-[#6b7280] uppercase">{d.texto}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
