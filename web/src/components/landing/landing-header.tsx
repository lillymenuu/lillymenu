"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { remapLegacyHref, aplicarBrand } from "@/lib/landing";

export function LandingHeader({
  brand,
  logoImage,
  navLinks,
  ctaSecondarioTexto,
}: {
  brand: string;
  logoImage: string;
  navLinks: { label: string; href: string }[];
  ctaSecondarioTexto: string;
}) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <header id="top" className="sticky top-0 z-40 border-b border-[#ece7e0] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2 text-[17px] font-bold transition-transform hover:-rotate-1 hover:scale-105">
          {logoImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoImage} alt={brand} className="size-8 rounded-lg object-contain" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#9c5523] text-sm font-bold text-white">
              {brand.charAt(0)}
            </span>
          )}
          <span>{brand}</span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[#5b6169] min-[880px]:flex">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={remapLegacyHref(item.href)}
              className="group relative py-1 transition-colors hover:text-[#1f2328]"
            >
              {aplicarBrand(item.label, brand)}
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[#9c5523] transition-transform duration-200 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 min-[880px]:flex">
          <a href="/login" className="text-sm font-semibold text-[#5b6169] underline underline-offset-4 hover:text-[#1f2328]">
            {ctaSecondarioTexto}
          </a>
          <a
            href="#cadastro"
            className={cn(
              buttonVariants({}),
              "landing-pulse h-9 rounded-[10px] px-4 shadow-[0_10px_22px_-6px_rgba(156,85,35,0.4)] transition-transform hover:-translate-y-0.5"
            )}
          >
            Cadastre-se
          </a>
        </div>

        <Button variant="ghost" size="icon" className="min-[880px]:hidden" onClick={() => setMenuAberto((v) => !v)} aria-label="Abrir menu">
          {menuAberto ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {menuAberto && (
        <div className="border-t border-[#ece7e0] bg-white px-4 pb-4 min-[880px]:hidden">
          <nav className="flex flex-col gap-1 pt-2 text-sm font-medium">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={remapLegacyHref(item.href)}
                onClick={() => setMenuAberto(false)}
                className="rounded-lg px-2 py-2.5 text-[#5b6169] hover:bg-[#f5ede5] hover:text-[#1f2328]"
              >
                {aplicarBrand(item.label, brand)}
              </a>
            ))}
          </nav>
          <div className="mt-2 flex flex-col gap-2">
            <a href="/login" className="rounded-[10px] border border-[#ece7e0] px-4 py-2 text-center text-sm font-semibold text-[#5b6169]">
              {ctaSecondarioTexto}
            </a>
            <a
              href="#cadastro"
              onClick={() => setMenuAberto(false)}
              className={cn(buttonVariants({ className: "w-full rounded-[10px]" }))}
            >
              Cadastre-se
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
