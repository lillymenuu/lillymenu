"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Menu, X, LogOut, Store, ChevronLeft, ChevronRight, Gem } from "lucide-react";
import type { SidebarData } from "@/lib/sidebar";
import { NAV_SECTIONS } from "@/components/sidebar-nav-config";
import { NotificationBell } from "@/components/notification-bell";
import { LojaInfoDialog } from "@/components/loja-info-dialog";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PosOverlayProvider, usePosOverlay } from "@/components/pos/pos-overlay-provider";
import { ValidadeAviso } from "@/components/produtos/validade-aviso";
import { cn } from "cn";

const COLLAPSE_KEY = "sidebarCollapsed";
const SIDEBAR_BRAND_BG =
  "radial-gradient(130% 55% at 12% 0%, rgba(255,255,255,.16), transparent 60%), linear-gradient(190deg, #9c5523 0%, #7a3f10 100%)";

export function AppShell(props: {
  sidebarData: SidebarData;
  phpAdminUrl: string;
  bloqueado?: boolean;
  logoPlataforma?: string;
  children: React.ReactNode;
}) {
  return (
    <PosOverlayProvider adminPerfil={props.sidebarData.admin.perfil} phpAdminUrl={props.phpAdminUrl}>
      <AppShellInner {...props} />
    </PosOverlayProvider>
  );
}

function AppShellInner({
  sidebarData,
  phpAdminUrl,
  bloqueado = false,
  logoPlataforma,
  children,
}: {
  sidebarData: SidebarData;
  phpAdminUrl: string;
  bloqueado?: boolean;
  logoPlataforma?: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  /* Arrasto da gaveta no celular (px, <= 0) enquanto o dedo esta na tela; null fora do gesto. */
  const [arrasteX, setArrasteX] = useState<number | null>(null);
  const toqueRef = useRef<{ x: number; y: number; t: number; eixo: "x" | "y" | null } | null>(null);
  const gavetaRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [lojaAberta, setLojaAberta] = useState(sidebarData.loja.aberta);
  const [alternandoLoja, setAlternandoLoja] = useState(false);
  const [lojaInfoOpen, setLojaInfoOpen] = useState(false);
  const [wlNaoLidas, setWlNaoLidas] = useState(0);
  const [suporteNaoLidas, setSuporteNaoLidas] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const { abrir: abrirPos } = usePosOverlay();

  useEffect(() => {
    if (!sidebarData.menu.whatslilly) return;
    let ativo = true;
    async function carregar() {
      try {
        const res = await fetch("/api/whatslilly/nao-lidas");
        const data = await res.json();
        if (ativo && data.ok) setWlNaoLidas(data.total_nao_lidas);
      } catch {
        // silencioso — proximo poll tenta de novo
      }
    }
    carregar();
    const interval = setInterval(carregar, 15000);
    return () => {
      ativo = false;
      clearInterval(interval);
    };
  }, [sidebarData.menu.whatslilly]);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const res = await fetch("/api/suporte/nao-lidas");
        const data = await res.json();
        if (ativo && data.ok) setSuporteNaoLidas(data.unread);
      } catch {
        // silencioso — proximo poll tenta de novo
      }
    }
    carregar();
    const interval = setInterval(carregar, 15000);
    return () => {
      ativo = false;
      clearInterval(interval);
    };
  }, [pathname]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // localStorage indisponivel; comeca expandida
    }
  }, []);

  /* Gaveta aberta no celular: trava a rolagem da pagina por baixo e fecha com Esc. */
  useEffect(() => {
    if (!mobileOpen) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  /* Arrastar a gaveta pra esquerda fecha (como num app): passou de 1/3 da largura ou foi um
     gesto rapido. Gesto mais vertical que horizontal e rolagem do menu, nao arrasto. */
  function onToqueInicio(e: React.TouchEvent) {
    if (!mobileOpen) return;
    const t = e.touches[0];
    toqueRef.current = { x: t.clientX, y: t.clientY, t: Date.now(), eixo: null };
  }

  function onToqueMove(e: React.TouchEvent) {
    const toque = toqueRef.current;
    if (!toque) return;
    const t = e.touches[0];
    const dx = t.clientX - toque.x;
    const dy = t.clientY - toque.y;
    if (toque.eixo === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      toque.eixo = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (toque.eixo === "x") setArrasteX(Math.min(0, dx));
  }

  function onToqueFim() {
    const toque = toqueRef.current;
    toqueRef.current = null;
    if (toque?.eixo === "x" && arrasteX !== null) {
      const largura = gavetaRef.current?.offsetWidth ?? 300;
      const velocidade = Math.abs(arrasteX) / Math.max(1, Date.now() - toque.t);
      if (arrasteX < -largura / 3 || (velocidade > 0.5 && arrasteX < -24)) setMobileOpen(false);
    }
    setArrasteX(null);
  }

  /* Fundo escurecido acompanha o dedo durante o arrasto (1 = gaveta toda aberta). */
  const opacidadeFundo = arrasteX === null ? 1 : Math.max(0, 1 + arrasteX / 300);

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
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] md:hidden",
          arrasteX === null && "transition-opacity duration-300",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        style={mobileOpen && arrasteX !== null ? { opacity: opacidadeFundo } : undefined}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        ref={gavetaRef}
        onTouchStart={onToqueInicio}
        onTouchMove={onToqueMove}
        onTouchEnd={onToqueFim}
        onTouchCancel={onToqueFim}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-52 shrink-0 overflow-hidden transition-[transform,width] duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0",
          /* Celular: gaveta larga, cantos arredondados e curva de abertura de app. */
          "max-md:w-[62vw] max-md:max-w-[240px] max-md:rounded-r-3xlmax-md:ease-[cubic-bezier(0.32,0.72,0,1)]",
          mobileOpen ? "translate-x-0 max-md:shadow-2xl" : "-translate-x-full",
          arrasteX !== null && "max-md:transition-none",
          collapsed ? "md:w-16" : "md:w-52"
        )}
        style={arrasteX !== null ? { transform: `translateX(${arrasteX}px)` } : undefined}
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
          <div className="flex items-center justify-between gap-2 p-4 max-md:pt-[max(1rem,env(safe-area-inset-top))]">
            {!collapsed && (
              <div className="flex min-w-0 items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPlataforma || "/favicon_store.png"}
                  alt=""
                  className="size-9 shrink-0 rounded-lg object-contain"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground">Lilly Menu</div>
                  <div className="truncate text-[10px] text-muted-foreground">Sistema de Gestão</div>
                </div>
              </div>
            )}
            <button
              className={cn(
                "flex size-10 items-center justify-center rounded-full md:hidden",
                collapsed ? "text-white active:bg-white/10" : "text-foreground active:bg-muted"
              )}
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={20} />
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
              <button
                type="button"
                onClick={() => setLojaInfoOpen(true)}
                className="flex flex-col items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Ver informações da loja"
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
                    collapsed
                      ? "size-10 bg-white/15 text-sm text-white"
                      : "size-20 border border-border bg-muted text-base text-foreground"
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
              </button>
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
                  disabled={alternandoLoja || bloqueado}
                  aria-label={lojaAberta ? "Fechar loja" : "Abrir loja"}
                />
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="flex flex-nowrap items-center justify-between gap-2 border-b border-border px-4 py-3 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <Gem size={11} />
                </span>
                <span className="truncate">{sidebarData.plano.nome}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                <span className="whitespace-nowrap">{sidebarData.plano.expira || "-"}</span>
                {sidebarData.plano.badge && (
                  <span className="whitespace-nowrap rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                    {sidebarData.plano.badge}
                  </span>
                )}
              </span>
            </div>
          )}

          <nav className="flex-1 px-2 py-3">
            <TooltipProvider delay={150}>
            {NAV_SECTIONS.map((section) => {
              const items = section.items.filter(
                (item) => item.menuKey === null || sidebarData.menu[item.menuKey]
              );
              if (items.length === 0) return null;
              return (
                <div key={section.title} className="mb-4">
                  {!collapsed && (
                    <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      {section.title}
                    </div>
                  )}
                  <ul className="flex flex-col gap-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      const itemBloqueado = bloqueado && item.href !== "/plan-details";
                      const className = cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors max-md:rounded-xl max-md:py-3 max-md:text-[15px]",
                        collapsed && "md:justify-center md:px-0",
                        itemBloqueado
                          ? cn("cursor-not-allowed opacity-40", collapsed ? "text-white/60" : "text-foreground/40")
                          : collapsed
                            ? active
                              ? "bg-white/20 font-medium text-white"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                            : active
                              ? "bg-primary/5 font-medium text-primary"
                              : "text-foreground/70 hover:bg-muted hover:text-foreground"
                      );
                      if (itemBloqueado) {
                        const itemBloqueadoNode = (
                          <span className={className} aria-disabled="true">
                            <Icon size={20} />
                            <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
                          </span>
                        );
                        return (
                          <li key={item.href}>
                            <Tooltip>
                              <TooltipTrigger render={itemBloqueadoNode} />
                              <TooltipContent side="right">Disponível após renovar o plano</TooltipContent>
                            </Tooltip>
                          </li>
                        );
                      }
                      const badge =
                        item.href === "/suporte" && suporteNaoLidas > 0 && pathname !== "/suporte" ? (
                          <span className="ml-auto flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-white">
                            {suporteNaoLidas > 99 ? "99+" : suporteNaoLidas}
                          </span>
                        ) : item.menuKey === "whatslilly" && wlNaoLidas > 0 ? (
                          <span className="ml-auto flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-white">
                            {wlNaoLidas > 99 ? "99+" : wlNaoLidas}
                          </span>
                        ) : null;
                      const link = item.opensPos ? (
                        <button
                          type="button"
                          className={className}
                          onClick={() => {
                            abrirPos();
                            setMobileOpen(false);
                          }}
                        >
                          <Icon size={20} />
                          <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
                          {!collapsed && badge}
                        </button>
                      ) : item.migrated ? (
                        <Link href={item.href} className={className} onClick={() => setMobileOpen(false)}>
                          <Icon size={20} />
                          <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
                          {!collapsed && badge}
                        </Link>
                      ) : (
                        <a href={`${phpAdminUrl}${item.href}`} className={className}>
                          <Icon size={20} />
                          <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
                          {!collapsed && badge}
                        </a>
                      );
                      return (
                        <li key={item.href}>
                          {collapsed ? (
                            <Tooltip>
                              <TooltipTrigger render={link} />
                              <TooltipContent side="right" className="hidden md:block">
                                {item.label}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            link
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            </TooltipProvider>
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
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/85 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-md md:hidden">
          <button
            className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors active:bg-muted"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={22} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-sm font-bold">
              {sidebarData.loja.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sidebarData.loja.logo.startsWith("http") ? sidebarData.loja.logo : `${phpAdminUrl}/${sidebarData.loja.logo}`}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                sidebarData.loja.inicial
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] leading-tight font-semibold">{sidebarData.loja.nome}</div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", lojaAberta ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                {lojaAberta ? "Loja aberta" : "Loja fechada"}
              </div>
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
        <footer className="border-t border-border py-4 text-center text-sm text-foreground">
          Lilly Menu Digital ©{new Date().getFullYear()}
        </footer>
      </div>

      <LojaInfoDialog
        open={lojaInfoOpen}
        onOpenChange={setLojaInfoOpen}
        loja={sidebarData.loja}
        phpAdminUrl={phpAdminUrl}
      />
      <ValidadeAviso lojaId={sidebarData.loja.id} />
    </div>
  );
}
