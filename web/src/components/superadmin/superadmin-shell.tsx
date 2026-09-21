"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Store, Headset, LogOut, Menu, X, ShieldCheck } from "lucide-react";
import { cn } from "cn";

const NAV = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/lojas", label: "Lojas", icon: Store },
  { href: "/superadmin/suporte", label: "Suporte", icon: Headset },
];

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return (partes[0]?.[0] ?? "S").toUpperCase() + (partes[1]?.[0] ?? "").toUpperCase();
}

export function SuperadminShell({
  admin,
  suporteNaoLidas: naoLidasInicial,
  children,
}: {
  admin: { nome: string; email: string };
  suporteNaoLidas: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [naoLidas, setNaoLidas] = useState(naoLidasInicial);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/superadmin/call?alvo=superadmin_suporte&acao=unread");
        const data = await res.json();
        if (ativo && data.ok) setNaoLidas(data.unread);
      } catch {
        // proximo poll tenta de novo
      }
    }
    const t = setInterval(carregar, 10000);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, []);

  async function sair() {
    await fetch("/api/superadmin/logout", { method: "POST" });
    router.push("/superadmin/login");
    router.refresh();
  }

  const atual = NAV.find((n) => pathname.startsWith(n.href));

  return (
    <div className="flex min-h-screen bg-muted/30">
      {aberto && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setAberto(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          aberto ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon_store.png" alt="" className="size-8 rounded-lg bg-white p-1" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">Lilly Menu</div>
              <div className="flex items-center gap-1 text-[11px] text-primary-foreground/60">
                <ShieldCheck size={11} /> Superadmin
              </div>
            </div>
          </div>
          <button className="rounded-md p-1 text-slate-400 hover:text-white lg:hidden" onClick={() => setAberto(false)} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Gestão</p>
          {NAV.map(({ href, label, icon: Icon }) => {
            const ativo = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setAberto(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  ativo ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {ativo && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />}
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {href === "/superadmin/suporte" && naoLidas > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-white">
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {iniciais(admin.nome)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium text-white">{admin.nome}</div>
              <div className="truncate text-xs text-slate-500">{admin.email}</div>
            </div>
            <button
              onClick={sair}
              className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="rounded-md p-1.5 hover:bg-muted lg:hidden" onClick={() => setAberto(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <h1 className="text-base font-semibold">{atual?.label ?? "Superadmin"}</h1>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
        <footer className="border-t py-4 text-center text-sm text-muted-foreground">
          Lilly Menu Digital ©{new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
