"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
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
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  const resultado = termo.trim()
    ? pages.filter((p) => p.label.toLowerCase().includes(termo.trim().toLowerCase()))
    : pages;

  return (
    <div ref={wrapRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
        <input
          type="text"
          placeholder="Buscar página..."
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => setOpen(true)}
          className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
      {open && (
        <div className="absolute top-full z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {resultado.length === 0 && (
            <div className="p-3 text-center text-sm text-muted-foreground">Nenhuma página encontrada.</div>
          )}
          {resultado.map((item) => {
            const Icon = item.icon;
            const className =
              "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm hover:bg-muted";
            return item.migrated ? (
              <Link key={item.href} href={item.href} className={className} onClick={() => setOpen(false)}>
                <Icon size={15} className="text-muted-foreground" />
                {item.label}
              </Link>
            ) : (
              <a key={item.href} href={`${phpAdminUrl}${item.href}`} className={className}>
                <Icon size={15} className="text-muted-foreground" />
                {item.label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
