"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "cn";

/** Botao flutuante "voltar ao topo", empilhado acima do botao de WhatsApp. So aparece depois de rolar a pagina. */
export function ScrollToTopButton() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const aoRolar = () => setVisivel(window.scrollY > 480);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed right-4 bottom-20 z-40 flex size-11 items-center justify-center rounded-full bg-[#111827] text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1f2937] sm:right-6 sm:bottom-24",
        visivel ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      )}
    >
      <ArrowUp className="size-5" />
    </button>
  );
}
