"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Headset,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Globe,
  Bell,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  Blocks,
  Grid2x2,
  SlidersHorizontal,
  FileText,
  Table2,
  Droplets,
  Landmark,
  Lock,
  CircleUserRound,
  LineChart,
  Code2,
  BookOpen,
  AlertTriangle,
  LifeBuoy,
  Send,
  CirclePlus,
  CircleCheck,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SaTopbarSearch } from "@/components/superadmin/sa-topbar-search";
import { cn } from "cn";

const NAV = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/lojas", label: "Lojas", icon: Store },
  { href: "/superadmin/suporte", label: "Suporte", icon: Headset },
  { href: "/superadmin/landing", label: "Landing page", icon: Globe },
];

/* Mesmas opcoes e icones do menu de referencia (Dashtrans) que ainda nao tem pagina real aqui —
   lista pedida explicitamente pelo usuario como "roadmap" do menu, pra ganhar tela propria depois.
   Sem href: linha nao clicavel (sem link morto fingindo que já funciona), so visual. */
const EM_CONSTRUCAO: { label: string; icon: LucideIcon; chevron: boolean }[] = [
  { label: "eCommerce", icon: ShoppingBag, chevron: true },
  { label: "Widgets", icon: Blocks, chevron: true },
  { label: "Applications", icon: Grid2x2, chevron: true },
  { label: "UI Components", icon: SlidersHorizontal, chevron: true },
  { label: "Forms", icon: FileText, chevron: true },
  { label: "Tables", icon: Table2, chevron: true },
  { label: "Icons", icon: Droplets, chevron: true },
  { label: "Pricing", icon: Landmark, chevron: false },
  { label: "Authentication", icon: Lock, chevron: true },
  { label: "Accounts", icon: CircleUserRound, chevron: true },
  { label: "Charts", icon: LineChart, chevron: true },
  { label: "Documentation", icon: Code2, chevron: false },
  { label: "FAQ", icon: BookOpen, chevron: false },
  { label: "Error Pages", icon: AlertTriangle, chevron: true },
  { label: "Support", icon: LifeBuoy, chevron: false },
  { label: "Feedback", icon: Send, chevron: false },
];

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return (partes[0]?.[0] ?? "S").toUpperCase() + (partes[1]?.[0] ?? "").toUpperCase();
}

/** Menu de conta — reaproveitado no topbar e no rodapé da sidebar, cada um com seu próprio gatilho.
 * Estrutura e ícones iguais à referência; "Upgrade to Pro"/"Account"/"Billing" ficam desabilitados
 * (sem pagina real por trás ainda — ver roadmap da sidebar). "Notifications" e "Sair" são ações
 * reais: a primeira leva pro mesmo suporte não lido do sino do topbar, a segunda desloga de verdade. */
function ContaMenu({ admin, sair, trigger }: { admin: { nome: string; email: string }; sair: () => void; trigger: React.ReactElement }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{iniciais(admin.nome)}</span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-foreground">{admin.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <CirclePlus size={14} /> Upgrade to Pro
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <CircleCheck size={14} /> Account
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <CreditCard size={14} /> Billing
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/superadmin/suporte" />}>
          <Bell size={14} /> Notifications
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={sair}>
          <LogOut size={14} /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
    <div className="flex min-h-screen bg-slate-100">
      {aberto && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setAberto(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-slate-100 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          aberto ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-5">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon_store.png" alt="" className="size-8 rounded-lg" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Lilly Menu</div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck size={11} /> Superadmin
              </div>
            </div>
          </div>
          <button className="rounded-md p-1 text-muted-foreground hover:text-foreground lg:hidden" onClick={() => setAberto(false)} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className="scrollbar-hidden min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Gestão</p>
          {NAV.map(({ href, label, icon: Icon }) => {
            const ativo = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setAberto(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  ativo ? "bg-white text-indigo-700 shadow-sm" : "text-slate-700 hover:bg-white/70"
                )}
              >
                <Icon size={18} className={ativo ? "text-indigo-600" : "text-slate-500"} />
                <span className="flex-1">{label}</span>
                {href === "/superadmin/suporte" && naoLidas > 0 ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white">
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </span>
                ) : (
                  <ChevronRight size={14} className="text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </Link>
            );
          })}

          <Separator className="my-3 bg-slate-200" />

          {EM_CONSTRUCAO.map(({ label, icon: Icon, chevron }) => (
            <div key={label} className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700" title="Em construção — página ainda não existe">
              <Icon size={18} className="text-slate-500" />
              <span className="flex-1">{label}</span>
              {chevron && <ChevronRight size={14} className="text-slate-400" />}
            </div>
          ))}
        </nav>

        <ContaMenu
          admin={admin}
          sair={sair}
          trigger={
            <button type="button" className="flex w-full items-center gap-3 border-t border-slate-200 p-4 text-left transition-colors hover:bg-white/70">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{iniciais(admin.nome)}</span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-medium">{admin.nome}</span>
                <span className="block truncate text-xs text-muted-foreground">{admin.email}</span>
              </span>
              <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
            </button>
          }
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="shrink-0 rounded-md p-1.5 hover:bg-muted lg:hidden" onClick={() => setAberto(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <h1 className="hidden shrink-0 text-base font-semibold sm:block">{atual?.label ?? "Superadmin"}</h1>

          <div className="flex flex-1 justify-end sm:justify-center">
            <SaTopbarSearch />
          </div>

          <Link
            href="/superadmin/suporte"
            className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={naoLidas > 0 ? `Suporte — ${naoLidas} não lidas` : "Suporte"}
          >
            <Bell size={18} />
            {naoLidas > 0 && <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-rose-500 ring-2 ring-background" />}
          </Link>

          <ContaMenu
            admin={admin}
            sair={sair}
            trigger={
              <button type="button" className="flex shrink-0 items-center gap-1.5 rounded-full p-1 pr-1.5 transition-colors hover:bg-muted" aria-label="Conta">
                <span className="flex size-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">{iniciais(admin.nome)}</span>
                <ChevronDown size={14} className="hidden text-muted-foreground sm:block" />
              </button>
            }
          />
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
        <footer className="border-t py-4 text-center text-sm text-muted-foreground">
          Lilly Menu Digital ©{new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
