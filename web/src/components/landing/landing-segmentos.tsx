"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

export function LandingSegmentos({ titulo, itens, imagem }: { titulo: string; itens: string[]; imagem: string }) {
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

  if (itens.length === 0) return null;

  return (
    <section className="relative overflow-hidden border-y border-[#e5e7eb] bg-[#f9fafb]">
      {imagem && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagem} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-[#f9fafb]/70" aria-hidden />
        </>
      )}
      <div className="relative mx-auto flex max-w-[860px] flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 md:py-24">
        <h2 className="text-[30px] leading-[1.2] font-extrabold tracking-tight">{titulo}</h2>
        <div ref={ref} className="flex flex-wrap justify-center gap-2">
          {itens.map((item, i) => (
            <span
              key={item}
              className={cn(
                "rounded-full border border-[#e5e7eb] bg-white px-3.5 py-1.5 text-sm font-medium text-[#111827] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[rgb(var(--landing-accent-rgb)/0.35)] hover:text-[var(--landing-accent)] hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)]",
                visivel ? "landing-card-reveal" : "opacity-0 translate-y-4"
              )}
              style={visivel ? { animationDelay: `${i * 60}ms` } : undefined}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
