"use client";

import { useEffect, useState } from "react";

/** Titulo do hero "digitado" letra a letra na primeira renderizacao. */
export function HeroTypedTitle({ resto, destaque }: { resto: string; destaque: string }) {
  const full = `${resto} ${destaque}`;
  const corteNegro = resto.length + 1;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setCount(full.length), 0);
      return () => clearTimeout(t);
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= full.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [full]);

  const shown = full.slice(0, count);
  const digitando = count < full.length;

  return (
    <h1 className="text-[40px] leading-[1.15] font-extrabold tracking-tight text-balance sm:text-[52px]">
      <span className="text-[#0b1220]">{shown.slice(0, corteNegro)}</span>
      <span className="text-[var(--landing-accent)]">{shown.slice(corteNegro)}</span>
      {digitando && (
        <span
          aria-hidden
          className="landing-caret-blink -mb-1 ml-0.5 inline-block h-[0.85em] w-[3px] translate-y-[3px] bg-[var(--landing-accent)] align-middle"
        />
      )}
    </h1>
  );
}
