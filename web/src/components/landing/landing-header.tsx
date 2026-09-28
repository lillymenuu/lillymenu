"use client";

import { useEffect, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [rolado, setRolado] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolado(window.scrollY > 8);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const original = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = original;
    };
  }, []);

  return (
    <header
      id="top"
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300",
        rolado ? "border-[#e5e7eb] bg-white/70 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl" : "border-transparent bg-white"
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2 text-[17px] font-bold">
          {logoImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoImage} alt={brand} className="size-8 rounded-lg object-contain" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#2563eb] text-sm font-bold text-white">
              {brand.charAt(0)}
            </span>
          )}
          <span>{brand}</span>
        </a>

        <nav className="hidden items-center gap-1 text-sm font-medium text-[#4b5563] min-[880px]:flex">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={remapLegacyHref(item.href)}
              className="rounded-full px-3.5 py-1.5 transition-all duration-200 hover:bg-[#eef2ff] hover:text-[#2563eb]"
            >
              {aplicarBrand(item.label, brand)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 min-[880px]:flex">
          <a href="/login" className="text-sm font-medium text-[#4b5563] hover:text-[#111827]">
            {ctaSecondarioTexto}
          </a>
          <a
            href="#cadastro"
            className={cn(
              "landing-pulse flex h-9 items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
            )}
          >
            Começar grátis <ArrowRight className="size-3.5" />
          </a>
        </div>

        <Button variant="ghost" size="icon" className="min-[880px]:hidden" onClick={() => setMenuAberto((v) => !v)} aria-label="Abrir menu">
          {menuAberto ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {menuAberto && (
        <div className="border-t border-[#e5e7eb] bg-white px-4 pb-4 min-[880px]:hidden">
          <nav className="flex flex-col gap-1 pt-2 text-sm font-medium">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={remapLegacyHref(item.href)}
                onClick={() => setMenuAberto(false)}
                className="rounded-lg px-2 py-2.5 text-[#4b5563] hover:bg-[#eef2ff] hover:text-[#111827]"
              >
                {aplicarBrand(item.label, brand)}
              </a>
            ))}
          </nav>
          <div className="mt-2 flex flex-col gap-2">
            <a
              href="/login"
              className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-center text-sm font-semibold text-[#4b5563]"
            >
              {ctaSecondarioTexto}
            </a>
            <a
              href="#cadastro"
              onClick={() => setMenuAberto(false)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
            >
              Começar grátis <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
