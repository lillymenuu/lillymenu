"use client";

import { useEffect, useRef, useState } from "react";
import { useStoreTheme } from "@/components/store/store-theme";

/** Carrossel de flyers da loja (imagens promocionais acima das categorias) — mesmo do flyerSlider legado. */
export function StoreFlyerSlider({ flyers }: { flyers: string[] }) {
  const { brown } = useStoreTheme();
  const sliderRef = useRef<HTMLDivElement>(null);
  const indiceRef = useRef(0);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || flyers.length < 2) return;

    let autoplay: ReturnType<typeof setInterval> | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const irPara = (i: number) => {
      const alvo = (i + flyers.length) % flyers.length;
      slider.scrollTo({ left: alvo * slider.clientWidth, behavior: "smooth" });
    };
    const parar = () => {
      if (autoplay) clearInterval(autoplay);
      autoplay = null;
    };
    const iniciar = () => {
      parar();
      autoplay = setInterval(() => irPara(indiceRef.current + 1), 4000);
    };
    const onScroll = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        const i = Math.round(slider.scrollLeft / slider.clientWidth);
        indiceRef.current = i;
        setIndice(i);
        iniciar();
      }, 120);
    };

    slider.addEventListener("scroll", onScroll, { passive: true });
    slider.addEventListener("pointerdown", parar);
    iniciar();
    return () => {
      parar();
      if (debounce) clearTimeout(debounce);
      slider.removeEventListener("scroll", onScroll);
      slider.removeEventListener("pointerdown", parar);
    };
  }, [flyers.length]);

  if (flyers.length === 0) return null;

  return (
    <div className="mx-auto mt-3.5 max-w-[901px] px-4">
      <div
        ref={sliderRef}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {flyers.map((src, i) => (
          <div key={`${src}-${i}`} className="aspect-[4/1] shrink-0 basis-full snap-start overflow-hidden rounded-2xl bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-full object-cover" />
          </div>
        ))}
      </div>
      {flyers.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {flyers.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === indice ? 16 : 6, background: i === indice ? brown : "#d1d5db" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
