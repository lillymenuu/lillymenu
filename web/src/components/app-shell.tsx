"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, LogOut, Store, ChevronLeft, ChevronRight } from "lucide-react";
import type { SidebarData } from "@/lib/sidebar";
import { NAV_SECTIONS } from "@/components/sidebar-nav-config";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "cn";

const COLLAPSE_KEY = "sidebarCollapsed";

export function AppShell({
  sidebarData,
  phpAdminUrl,
  children,
}: {
  sidebarData: SidebarData;
  phpAdminUrl: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // localStorage indisponivel; comeca expandida
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // sem persistencia; ainda alterna nesta sessao
      }
      return next;
    });
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col overflow-y-auto overflow-x-hidden text-white transition-[transform,width] md:sticky md:top-0 md:h-screen md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-16" : "md:w-72"
        )}
        style={{
          background:
            "radial-gradient(130% 55% at 12% 0%, rgba(255,255,255,.16), transparent 60%), linear-gradient(190deg, #9c5523 0%, #7a3f10 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/15 p-4">
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">Lilly Menu</div>
              <div className="truncate text-xs text-white/70">Sistema de Gestão</div>
            </div>
          )}
          <button
            className="rounded-md p-1 hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
          <button
            className="hidden shrink-0 rounded-md p-1 hover:bg-white/10 md:block"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div className={cn("flex items-center gap-3 border-b border-white/15 p-4", collapsed && "md:justify-center md:px-2")}>
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-sm font-bold">
            {sidebarData.loja.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${phpAdminUrl}/${sidebarData.loja.logo}`}
                alt={sidebarData.loja.nome}
                className="size-full object-cover"
              />
            ) : (
              sidebarData.loja.inicial
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 md:min-w-0">
              <div className="truncate text-sm font-semibold">{sidebarData.loja.nome}</div>
              <div className="flex items-center gap-1 text-xs text-white/70">
                <Store size={11} />
                {sidebarData.loja.aberta ? "Loja aberta" : "Loja fechada"}
              </div>
            </div>
          )}
          <div className={cn(collapsed && "md:hidden")}>
            <NotificationBell lojaId={sidebarData.loja.id} phpAdminUrl={phpAdminUrl} />
          </div>
        </div>

        {!collapsed && (
          <div className="flex items-center justify-between gap-2 border-b border-white/15 px-4 py-3 text-xs">
            <span className="font-medium">{sidebarData.plano.nome}</span>
            <span className="flex items-center gap-1 text-white/70">
              {sidebarData.plano.expira || "-"}
              {sidebarData.plano.badge && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                  {sidebarData.plano.badge}
                </span>
              )}
            </span>
          </div>
        )}

        <nav className="flex-1 px-2 py-3">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter(
              (item) => item.menuKey === null || sidebarData.menu[item.menuKey]
            );
            if (items.length === 0) return null;
            return (
              <div key={section.title} className="mb-4">
                {!collapsed && (
                  <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">
                    {section.title}
                  </div>
                )}
                <ul className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    const className = cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      collapsed && "md:justify-center md:px-0",
                      active
                        ? "bg-white/20 font-medium text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    );
                    return (
                      <li key={item.href}>
                        {item.migrated ? (
                          <Link href={item.href} className={className} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}>
                            <Icon size={16} />
                            <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
                          </Link>
                        ) : (
                          <a href={`${phpAdminUrl}${item.href}`} className={className} title={collapsed ? item.label : undefined}>
                            <Icon size={16} />
                            <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className={cn("flex items-center justify-between gap-2 border-t border-white/15 p-4", collapsed && "md:justify-center md:px-2")}>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{sidebarData.admin.nome}</div>
              <div className="truncate text-xs text-white/60">{sidebarData.admin.email}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-background p-3 md:hidden">
          <button
            className="rounded-md p-1.5 hover:bg-muted"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold">{sidebarData.loja.nome}</span>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
