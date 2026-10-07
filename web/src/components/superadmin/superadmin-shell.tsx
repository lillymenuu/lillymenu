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
  User,
  Settings,
  Download,
  DollarSign,
  CirclePlus,
  CircleCheck,
  CreditCard,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SaTopbarSearch } from "@/components/superadmin/sa-topbar-search";
import { SaNotificacoesMenu } from "@/components/superadmin/sa-notificacoes-menu";
import { urlArquivo } from "@/lib/superadmin";
import { cn } from "cn";

const PHP_ADMIN_URL = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

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

/** Avatar do admin: foto de verdade (enviada em /superadmin/perfil) ou iniciais como fallback —
 * reaproveitado em todo canto que mostra a identidade do superadmin logado (rodapé da sidebar,
 * topbar, os dois menus de conta). */
function AvatarAdmin({ nome, foto, className }: { nome: string; foto: string | null; className?: string }) {
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={urlArquivo(foto, PHP_ADMIN_URL)} alt="" className={cn("shrink-0 rounded-full border bg-white object-cover", className)} />
    );
  }
  return <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white", className)}>{iniciais(nome)}</span>;
}

/** Linha "morta" do menu de conta: mesmo peso visual de um item real (texto/ícone escuros, sem
 * esmaecer), só sem onClick/href — pra bater com o print, onde esses itens aparecem legíveis
 * normalmente (não acinzentados como um `disabled` de verdade deixaria). */
function ContaMenuLinhaInerte({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground select-none">
      <Icon size={17} className="shrink-0 text-foreground" />
      {children}
    </div>
  );
}

/** Menu de conta do avatar no topbar. Estrutura/ícones/agrupamento iguais à referência: card cinza
 * com avatar+nome+cargo, lista Profile/Settings/Dashboard, divisor, Downloads/Earnings, divisor,
 * botão preto de Logout. "Profile" leva pra /superadmin/perfil (página real); "Dashboard" e "Sair"
 * também são reais. "Settings"/"Downloads"/"Earnings" ficam inertes (sem página própria ainda —
 * mesmo critério do roadmap da sidebar). Cargo mostrado é "Superadmin" (não a referência "Manager"
 * nem o email): é o dado real equivalente que temos — só existe um papel possível pra quem acessa
 * este painel. */
function ContaMenuTopbar({ admin, sair, trigger }: { admin: { nome: string; email: string; foto: string | null }; sair: () => void; trigger: React.ReactElement }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="w-60 p-2">
        <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
          <AvatarAdmin nome={admin.nome} foto={admin.foto} className="size-9 text-xs" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">{admin.nome}</p>
            <p className="truncate text-xs text-muted-foreground">Superadmin</p>
          </div>
        </div>

        <div className="pt-1">
          <DropdownMenuItem render={<Link href="/superadmin/perfil" />} className="gap-3 rounded-md px-3 py-2.5 text-sm">
            <User size={17} /> Profile
          </DropdownMenuItem>
          <ContaMenuLinhaInerte icon={Settings}>Settings</ContaMenuLinhaInerte>
          <DropdownMenuItem render={<Link href="/superadmin/dashboard" />} className="gap-3 rounded-md px-3 py-2.5 text-sm">
            <LayoutDashboard size={17} /> Dashboard
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <div>
          <ContaMenuLinhaInerte icon={Download}>Downloads</ContaMenuLinhaInerte>
          <ContaMenuLinhaInerte icon={DollarSign}>Earnings</ContaMenuLinhaInerte>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem
          onClick={sair}
          className="justify-center gap-2 rounded-lg bg-foreground px-3 py-1.5 text-sm font-semibold text-background hover:bg-foreground focus:bg-foreground/90 focus:text-background"
        >
          <LogOut size={16} /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Menu de conta do rodapé da sidebar — referência própria, diferente do topbar (o print mostrado
 * pra essa posição é outro, com avatar+nome+email, "Upgrade to Pro", divisor, grupo "Account"/
 * "Billing"/"Notifications", divisor, "Sair"). Abre "de lado" (`side="right"`), flutuando à
 * direita do rodapé em vez de cair por baixo como um dropdown comum — assim como no print.
 * "Account" leva pra /superadmin/perfil (mesma página real de "Profile" no topbar — ambos os
 * menus de referência convergem pro mesmo conceito); "Notifications" e "Sair" também são reais.
 * "Upgrade to Pro"/"Billing" ficam inertes (sem página própria ainda). */
function ContaMenuSidebar({ admin, sair, trigger }: { admin: { nome: string; email: string; foto: string | null }; sair: () => void; trigger: React.ReactElement }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-64 p-2">
        <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
          <AvatarAdmin nome={admin.nome} foto={admin.foto} className="size-9 text-xs" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">{admin.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
          </div>
        </div>

        <div className="pt-1">
          <ContaMenuLinhaInerte icon={CirclePlus}>Upgrade to Pro</ContaMenuLinhaInerte>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <div>
          <DropdownMenuItem render={<Link href="/superadmin/perfil" />} className="gap-3 rounded-md px-3 py-2.5 text-sm">
            <CircleCheck size={17} /> Account
          </DropdownMenuItem>
          <ContaMenuLinhaInerte icon={CreditCard}>Billing</ContaMenuLinhaInerte>
          <DropdownMenuItem render={<Link href="/superadmin/suporte" />} className="gap-3 rounded-md px-3 py-2.5 text-sm">
            <Bell size={17} /> Notifications
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem onClick={sair} className="gap-3 rounded-md px-3 py-2.5 text-sm">
          <LogOut size={17} /> Sair
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
  admin: { nome: string; email: string; foto: string | null };
  suporteNaoLidas: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [naoLidas, setNaoLidas] = useState(naoLidasInicial);
  const [recolhido, setRecolhido] = useState(false);
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    try {
      setRecolhido(localStorage.getItem("sa-sidebar-recolhida") === "1");
    } catch {
      // sem localStorage (ex. navegação privada): mantém expandida
    }
  }, []);

  useEffect(() => {
    function aoRolar() {
      setRolou(window.scrollY > 4);
    }
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  function alternarRecolhido() {
    setRecolhido((atual) => {
      const novo = !atual;
      try {
        localStorage.setItem("sa-sidebar-recolhida", novo ? "1" : "0");
      } catch {
        // sem localStorage: a preferência só dura a sessão
      }
      return novo;
    });
  }

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
    <div className="flex min-h-screen bg-white">
      {aberto && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setAberto(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          aberto ? "translate-x-0" : "-translate-x-full",
          recolhido ? "lg:w-[76px]" : "lg:w-[207px]"
        )}
      >
        <div className={cn("flex items-center gap-2.5 px-5 py-5", recolhido ? "lg:justify-center lg:px-0" : "justify-between")}>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon_store.png" alt="" className="size-8 shrink-0 rounded-lg" />
            <div className={cn("leading-tight", recolhido && "lg:hidden")}>
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

        <nav className="scrollbar-hidden min-h-0 flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
          <p className={cn("px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase", recolhido && "lg:hidden")}>Gestão</p>
          {NAV.map(({ href, label, icon: Icon }) => {
            const ativo = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setAberto(false)}
                title={recolhido ? label : undefined}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors",
                  recolhido && "lg:justify-center lg:px-0",
                  ativo ? "bg-indigo-50 text-foreground" : "text-foreground hover:bg-slate-100"
                )}
              >
                <Icon size={16} className="shrink-0 text-foreground" />
                <span className={cn("flex-1", recolhido && "lg:hidden")}>{label}</span>
                {href === "/superadmin/suporte" && naoLidas > 0 ? (
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white", recolhido && "lg:hidden")}>
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </span>
                ) : (
                  <ChevronRight size={13} className={cn("shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100", recolhido && "lg:hidden")} />
                )}
              </Link>
            );
          })}

          <Separator className="my-3 bg-slate-200" />

          {EM_CONSTRUCAO.map(({ label, icon: Icon, chevron }) => (
            <div
              key={label}
              title={recolhido ? label : "Em construção — página ainda não existe"}
              className={cn(
                "flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2.5 text-xs font-medium whitespace-nowrap text-foreground",
                recolhido && "lg:justify-center lg:px-0"
              )}
            >
              <Icon size={16} className="shrink-0 text-foreground" />
              <span className={cn("flex-1", recolhido && "lg:hidden")}>{label}</span>
              {chevron && <ChevronRight size={13} className={cn("shrink-0 text-slate-400", recolhido && "lg:hidden")} />}
            </div>
          ))}
        </nav>

        <ContaMenuSidebar
          admin={admin}
          sair={sair}
          trigger={
            <button
              type="button"
              title={recolhido ? admin.nome : undefined}
              className={cn("flex w-full items-center gap-3 border-t border-slate-200 p-4 text-left transition-colors hover:bg-slate-100", recolhido && "lg:justify-center lg:px-0")}
            >
              <AvatarAdmin nome={admin.nome} foto={admin.foto} className="size-9 text-xs" />
              <span className={cn("min-w-0 flex-1 leading-tight", recolhido && "lg:hidden")}>
                <span className="block truncate text-sm font-medium">{admin.nome}</span>
                <span className="block truncate text-xs text-muted-foreground">{admin.email}</span>
              </span>
              <ChevronDown size={14} className={cn("shrink-0 text-muted-foreground", recolhido && "lg:hidden")} />
            </button>
          }
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 flex items-center gap-3 px-4 py-3 transition-colors duration-200 lg:px-8",
            rolou ? "border-b bg-background/80 backdrop-blur" : "border-b border-transparent bg-background"
          )}
        >
          <button className="shrink-0 rounded-md p-1.5 hover:bg-muted lg:hidden" onClick={() => setAberto(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <button
            type="button"
            className="hidden shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
            onClick={alternarRecolhido}
            aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
            title={recolhido ? "Expandir menu" : "Recolher menu"}
          >
            <PanelLeft size={18} />
          </button>
          <h1 className="hidden shrink-0 text-base font-semibold sm:block">{atual?.label ?? "Superadmin"}</h1>

          <div className="flex flex-1 justify-end sm:justify-center">
            <SaTopbarSearch />
          </div>

          <SaNotificacoesMenu naoLidasSuporteInicial={naoLidas} />

          <ContaMenuTopbar
            admin={admin}
            sair={sair}
            trigger={
              <button type="button" className="flex shrink-0 items-center gap-1.5 rounded-full p-1 pr-1.5 transition-colors hover:bg-muted" aria-label="Conta">
                <AvatarAdmin nome={admin.nome} foto={admin.foto} className="size-7 text-[11px]" />
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
