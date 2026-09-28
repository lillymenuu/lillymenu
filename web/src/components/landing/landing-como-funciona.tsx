"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { rolarParaAncora } from "@/lib/landing";

const PASSOS = [
  { titulo: "Cadastre sua loja", texto: "Leva menos de 2 minutos: seus dados, sua empresa e o plano que combina com o seu negócio." },
  { titulo: "Configure cardápio e PDV", texto: "Adicione produtos, mesas e formas de pagamento — tudo pronto pra operar no mesmo dia." },
  { titulo: "Comece a vender", texto: "Balcão, mesas e delivery próprio num painel só, sem comissão por pedido de marketplace." },
];

export function LandingComoFunciona() {
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
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="como-funciona" className="scroll-mt-20 bg-[#0b1220]">
      <div className="mx-auto max-w-[1180px] px-4 py-16 text-center sm:px-6 md:py-24">
        <span className="text-sm font-bold tracking-widest text-[#60a5fa] uppercase">Como funciona</span>
        <h2 className="mt-3 text-[30px] leading-[1.2] font-extrabold tracking-tight text-white">Do cadastro à primeira venda</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-white/60">Três passos simples pra colocar sua loja no ar.</p>

        <div ref={ref} className="mt-12 grid gap-5 text-left sm:grid-cols-3">
          {PASSOS.map((passo, i) => (
            <div
              key={passo.titulo}
              className={cn(
                "flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(37,99,235,0.18)]",
                i === PASSOS.length - 1
                  ? "border-[#2563eb]/50 bg-[#111a2e] hover:border-[#2563eb]"
                  : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/[0.07]",
                visivel ? "landing-card-reveal" : "opacity-0 translate-y-4"
              )}
              style={visivel ? { animationDelay: `${i * 120}ms` } : undefined}
            >
              <span
                className={`flex size-9 items-center justify-center rounded-lg text-base font-bold ${
                  i === PASSOS.length - 1 ? "bg-white text-[#0b1220]" : "bg-[#1e293b] text-[#60a5fa]"
                }`}
              >
                {i + 1}
              </span>
              <h3 className="text-base font-bold text-white">{passo.titulo}</h3>
              <p className="text-[14px] leading-relaxed text-white/60">{passo.texto}</p>
            </div>
          ))}
        </div>

        <a
          href="#cadastro"
          onClick={(e) => {
            e.preventDefault();
            rolarParaAncora("#cadastro");
          }}
          className="landing-cta-pulse mt-12 inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-base font-semibold text-[#0b1220] transition-transform hover:-translate-y-0.5"
        >
          Criar minha loja grátis
        </a>
      </div>
    </section>
  );
}
