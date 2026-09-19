"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "cn";

/** Botao flutuante que leva a pagina ao topo. So aparece depois de rolar `aposPx` pixels pra baixo. */
export function ScrollToTop({ aposPx = 300 }: { aposPx?: number }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const atualizar = () => setVisivel(window.scrollY > aposPx);
    atualizar();
    window.addEventListener("scroll", atualizar, { passive: true });
    return () => window.removeEventListener("scroll", atualizar);
  }, [aposPx]);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      tabIndex={visivel ? 0 : -1}
      className={cn(
        "fixed right-5 bottom-5 z-40 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        visivel ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <ArrowUp size={20} />
    </button>
  );
}
