"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Menu, X, LogOut, Store, ChevronLeft, ChevronRight, Gem } from "lucide-react";
import type { SidebarData } from "@/lib/sidebar";
import { NAV_SECTIONS } from "@/components/sidebar-nav-config";
import { NotificationBell } from "@/components/notification-bell";
import { Switch } from "@/components/ui/switch";
import { cn } from "cn";

const COLLAPSE_KEY = "sidebarCollapsed";
const SIDEBAR_BRAND_BG =
  "radial-gradient(130% 55% at 12% 0%, rgba(255,255,255,.16), transparent 60%), linear-gradient(190deg, #9c5523 0%, #7a3f10 100%)";

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
  const [lojaAberta, setLojaAberta] = useState(sidebarData.loja.aberta);
  const [alternandoLoja, setAlternandoLoja] = useState(false);
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

  async function handleToggleLoja(aberta: boolean) {
    setLojaAberta(aberta);
    setAlternandoLoja(true);
    try {
      const res = await fetch("/api/loja-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aberta }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLojaAberta(!aberta);
        toast.error(data.msg ?? "Erro ao atualizar o status da loja.");
        return;
      }
      toast.success(aberta ? "Loja aberta" : "Loja fechada");
      router.refresh();
    } catch {
      setLojaAberta(!aberta);
      toast.error("Erro ao atualizar o status da loja.");
    } finally {
      setAlternandoLoja(false);
    }
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
          "fixed inset-y-0 left-0 z-50 w-52 shrink-0 overflow-hidden transition-[transform,width] duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-16" : "md:w-52"
        )}
      >
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-300",
            collapsed ? "opacity-100" : "opacity-0"
          )}
          style={{ background: SIDEBAR_BRAND_BG }}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 bg-white transition-opacity duration-300",
            collapsed ? "opacity-0" : "opacity-100"
          )}
        />

        <div className="scrollbar-thin relative z-10 flex h-full flex-col overflow-y-auto overflow-x-hidden">
          <div
            className={cn(
              "flex items-center justify-between gap-2 border-b p-4",
              collapsed ? "border-white/15" : "border-border"
            )}
          >
            {!collapsed && (
              <div className="flex min-w-0 items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${phpAdminUrl}/assets/img/favicon_store.png`}
                  alt=""
                  className="size-6 shrink-0 rounded-md object-contain"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground">Lilly Menu</div>
                  <div className="truncate text-xs text-muted-foreground">Sistema de Gestão</div>
                </div>
              </div>
            )}
            <button
              className={cn(
                "rounded-md p-1 md:hidden",
                collapsed ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
              )}
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
            <button
              className={cn(
                "hidden shrink-0 rounded-md p-1 md:block",
                collapsed ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
              )}
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <div
            className={cn(
              "border-b p-4",
              collapsed ? "border-white/15" : "border-border"
            )}
          >
            <div className="relative flex flex-col items-center">
              <div className={cn("absolute right-0 top-0", collapsed && "md:hidden")}>
                <NotificationBell lojaId={sidebarData.loja.id} phpAdminUrl={phpAdminUrl} theme="light" />
              </div>
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
                  collapsed
                    ? "size-10 bg-white/15 text-sm text-white"
                    : "size-14 border border-border bg-muted text-base text-foreground"
                )}
              >
                {sidebarData.loja.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      sidebarData.loja.logo.startsWith("http")
                        ? sidebarData.loja.logo
                        : `${phpAdminUrl}/${sidebarData.loja.logo}`
                    }
                    alt={sidebarData.loja.nome}
                    className="size-full object-cover"
                  />
                ) : (
                  sidebarData.loja.inicial
                )}
              </div>
              {!collapsed && (
                <div className="mt-2 max-w-full text-center text-sm font-semibold leading-tight text-foreground">
                  {sidebarData.loja.nome}
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                    lojaAberta ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Store size={10} />
                  {lojaAberta ? "Loja aberta" : "Loja fechada"}
                </span>
                <Switch
                  checked={lojaAberta}
                  onCheckedChange={handleToggleLoja}
                  disabled={alternandoLoja}
                  aria-label={lojaAberta ? "Fechar loja" : "Abrir loja"}
                />
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <Gem size={11} />
                </span>
                {sidebarData.plano.nome}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                {sidebarData.plano.expira || "-"}
                {sidebarData.plano.badge && (
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
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
                    <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                        collapsed
                          ? active
                            ? "bg-white/20 font-medium text-white"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                          : active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-foreground/70 hover:bg-muted hover:text-foreground"
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

          <div
            className={cn(
              "flex items-center justify-between gap-2 border-t p-4",
              collapsed ? "border-white/15" : "border-border",
              collapsed && "md:justify-center md:px-2"
            )}
          >
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{sidebarData.admin.nome}</div>
                <div className="truncate text-xs text-muted-foreground">{sidebarData.admin.email}</div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={cn(
                "shrink-0 rounded-md p-2",
                collapsed ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Sair"
              aria-label="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
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
