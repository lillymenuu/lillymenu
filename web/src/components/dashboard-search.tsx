"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getSearchablePages } from "@/components/sidebar-nav-config";

export function DashboardSearch({
  menu,
  phpAdminUrl,
}: {
  menu: Record<string, boolean>;
  phpAdminUrl: string;
}) {
  const pages = getSearchablePages(menu);
  const [termo, setTermo] = useState("");
  const [open, setOpen] = useState(false);

  const resultado = termo.trim()
    ? pages.filter((p) => p.label.toLowerCase().includes(termo.trim().toLowerCase()))
    : pages;

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-64 shrink-0 items-center gap-2 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Buscar página"
      >
        <Search size={15} className="shrink-0" />
        <span className="flex-1 text-left">Buscar</span>
        <span className="flex shrink-0 items-center gap-0.5 rounded-md border bg-muted px-1.5 py-0.5 text-[11px] font-medium">
          Ctrl K
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setTermo("");
        }}
      >
        <DialogContent className="max-w-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buscar página</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={14}
            />
            <Input
              autoFocus
              className="pl-8"
              placeholder="Buscar página..."
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
            />
          </div>
          <div className="grid max-h-96 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {resultado.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                Nenhuma página encontrada.
              </div>
            )}
            {resultado.map((item) => {
              const Icon = item.icon;
              const className =
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs hover:bg-muted";
              return item.migrated ? (
                <Link key={item.href} href={item.href} className={className} onClick={() => setOpen(false)}>
                  <Icon size={20} className="text-primary" />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              ) : (
                <a key={item.href} href={`${phpAdminUrl}${item.href}`} className={className}>
                  <Icon size={20} className="text-primary" />
                  <span className="leading-tight">{item.label}</span>
                </a>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
