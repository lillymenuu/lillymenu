"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
    <header id="top" className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <a href="#top" className="flex items-center gap-2 font-semibold">
          {logoImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoImage} alt={brand} className="size-8 rounded-lg object-contain" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {brand.charAt(0)}
            </span>
          )}
          <span>{brand}</span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {navLinks.map((item) => (
            <a key={item.label} href={remapLegacyHref(item.href)} className="transition-colors hover:text-foreground">
              {aplicarBrand(item.label, brand)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a href="/login" className={buttonVariants({ variant: "outline" })}>
            {ctaSecondarioTexto}
          </a>
          <a href="#cadastro" className={buttonVariants({})}>
            Cadastre-se
          </a>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuAberto((v) => !v)} aria-label="Abrir menu">
          {menuAberto ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {menuAberto && (
        <div className="border-t bg-background px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2 text-sm font-medium">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={remapLegacyHref(item.href)}
                onClick={() => setMenuAberto(false)}
                className="rounded-lg px-2 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {aplicarBrand(item.label, brand)}
              </a>
            ))}
          </nav>
          <div className="mt-2 flex flex-col gap-2">
            <a href="/login" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              {ctaSecondarioTexto}
            </a>
            <a href="#cadastro" onClick={() => setMenuAberto(false)} className={buttonVariants({ className: "w-full" })}>
              Cadastre-se
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
