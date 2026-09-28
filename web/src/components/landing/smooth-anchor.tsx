"use client";

import type { ReactNode } from "react";
import { rolarParaAncora } from "@/lib/landing";

/** Link de ancora ("#id") que rola suavemente ate a secao sem deixar o hash aparecer na URL. */
export function SmoothAnchor({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        if (!href.startsWith("#")) return;
        e.preventDefault();
        rolarParaAncora(href);
      }}
    >
      {children}
    </a>
  );
}
