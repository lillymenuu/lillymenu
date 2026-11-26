"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Store,
  Palette,
  Users,
  ShieldCheck,
  BadgeCheck,
  Clock,
  PauseCircle,
  CreditCard,
  Coins,
  Sparkles,
  Inbox,
  ShoppingBag,
  Hash,
  ListOrdered,
  CalendarCheck,
  MapPin,
  ShoppingCart,
  Webhook,
  Table2,
  Printer,
  Scale,
  TrendingUp,
  BookOpen,
  ExternalLink,
  Shuffle,
  Globe,
  Settings2,
  ChevronRight,
  Lock,
  Heart,
  Plug,
  LayoutGrid,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { ConfiguracoesDetalhe } from "@/lib/settings";
import { LojaInfoDialog } from "@/components/settings/loja-info-dialog";
import { MenuCustomDialog } from "@/components/settings/menu-custom-dialog";
import { UsuariosDialog } from "@/components/settings/usuarios-dialog";
import { SeloVerificacaoDialog } from "@/components/settings/selo-verificacao-dialog";
import { HorariosDialog } from "@/components/settings/horarios-dialog";
import { PausaDialog } from "@/components/settings/pausa-dialog";
import { FormasPagamentoDialog } from "@/components/settings/formas-pagamento-dialog";
import { CashbackDialog } from "@/components/settings/cashback-dialog";
import { ClubePontosDialog } from "@/components/settings/clube-pontos-dialog";
import { ReceberPedidosDialog } from "@/components/settings/receber-pedidos-dialog";
import { TiposPedidosDialog } from "@/components/settings/tipos-pedidos-dialog";
import { ValorMinimoDialog } from "@/components/settings/valor-minimo-dialog";
import { TaxaEntregaDialog } from "@/components/settings/taxa-entrega-dialog";
import { ImpressaoDialog } from "@/components/settings/impressao-dialog";
import { CrossSellDialog } from "@/components/settings/cross-sell-dialog";
import { FusoHorarioDialog } from "@/components/settings/fuso-horario-dialog";
import { FUSOS_BRASIL } from "@/lib/fusos";

type CardId =
  | "loja-info"
  | "menu-custom"
  | "usuarios"
  | "selo-verificacao"
  | "horarios"
  | "fuso-horario"
  | "pausa"
  | "formas-pagamento"
  | "cashback"
  | "clube-pontos"
  | "receber-pedidos"
  | "tipos-pedidos"
  | "valor-minimo"
  | "pedidos-agendados"
  | "taxa-entrega"
  | "impressao"
  | "versiculo-dashboard"
  | "cross-sell";

type CardDef = {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  badge?: string;
  disabled?: boolean;
  linkOut?: string;
};

type Section = { title: string; cards: CardDef[] };

const ICONE_SECAO: Record<string, LucideIcon> = {
  Loja: Store,
  Fidelidade: Heart,
  Pedidos: Inbox,
  "Integrações": Plug,
  "Pedidos na mesa": Table2,
  Outros: LayoutGrid,
};

/* Brilho que acompanha o cursor no card (posicao via CSS vars, sem re-render). */
function moverBrilho(e: React.MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export function SettingsManager({
  dadosIniciais,
  phpAdminUrl,
  pedidosAgendadosDisponivel,
}: {
  dadosIniciais: ConfiguracoesDetalhe;
  phpAdminUrl: string;
  pedidosAgendadosDisponivel: boolean;
}) {
  const [dados, setDados] = useState(dadosIniciais);
  const [aberto, setAberto] = useState<CardId | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const abrirParam = searchParams.get("abrir");
    if (abrirParam === "pedidos-agendados") {
      router.replace("/scheduled-orders");
      return;
    }
    if (abrirParam) setAberto(abrirParam as CardId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [versiculoAtivo, setVersiculoAtivo] = useState(dados.versiculo_dashboard_ativo);
  const [salvandoVersiculo, setSalvandoVersiculo] = useState(false);

  async function recarregar() {
    try {
      const res = await fetch("/api/settings/detalhe");
      const data = await res.json();
      if (data.ok) {
        setDados(data);
      }
    } catch {
      // silencioso — mantem os dados anteriores na tela
    }
  }

  async function alternarVersiculo(v: boolean) {
    setVersiculoAtivo(v);
    setSalvandoVersiculo(true);
    try {
      const res = await fetch("/api/settings/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave: "versiculo_dashboard_ativo", ativo: v }),
      });
      const data = await res.json();
      if (!data.ok) {
        setVersiculoAtivo(!v);
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Configuração salva.");
    } catch {
      setVersiculoAtivo(!v);
      toast.error("Erro ao salvar.");
    } finally {
      setSalvandoVersiculo(false);
    }
  }

  const sections: Section[] = [
    {
      title: "Loja",
      cards: [
        { id: "loja-info", icon: Store, title: "Informações da loja", desc: "Defina nome, logo e identidade da marca." },
        { id: "menu-custom", icon: Palette, title: "Customize o menu", desc: "Ajuste cores, banners e layout do cardapio." },
        { id: "usuarios", icon: Users, title: "Usuários", desc: "Gerencie contas e acessos da equipe." },
        { id: "permissoes", icon: ShieldCheck, title: "Permissões", desc: "Defina niveis e politicas de acesso.", linkOut: "permissoes.php" },
        { id: "selo-verificacao", icon: BadgeCheck, title: "Selo de verificação", desc: "Verifique seu contato e exiba o selo de loja verificada no cardápio.", badge: "Novo" },
        { id: "horarios", icon: Clock, title: "Horário de funcionamento", desc: "Configure abertura, fechamento e dias ativos." },
        {
          id: "fuso-horario",
          icon: Globe,
          title: "Fuso horário",
          desc: `Relógio da loja: ${FUSOS_BRASIL.find((f) => f.valor === dados.fuso_horario)?.rotulo ?? dados.fuso_horario}.`,
          badge: "Novo",
        },
        { id: "pausa", icon: PauseCircle, title: "Pausa programada", desc: "Agende pausas automaticas da loja." },
        { id: "formas-pagamento", icon: CreditCard, title: "Formas de pagamento", desc: "Defina meios aceitos e taxas." },
        { id: "cross-sell", icon: Shuffle, title: "Cross-sell", desc: "Gere sugestões automáticas de produtos complementares no carrinho.", badge: "Novo" },
      ],
    },
    {
      title: "Fidelidade",
      cards: [
        { id: "cashback", icon: Coins, title: "Cashback", desc: "Configure regras e percentual de retorno.", badge: "Novo" },
        { id: "clube-pontos", icon: Sparkles, title: "Clube de pontos", desc: "Ative o programa de fidelidade por pontos.", badge: "Novo" },
      ],
    },
    {
      title: "Pedidos",
      cards: [
        { id: "receber-pedidos", icon: Inbox, title: "Receber pedidos", desc: "Canais, alertas e regras de recebimento." },
        { id: "tipos-pedidos", icon: ShoppingBag, title: "Tipos de pedidos", desc: "Ative entrega, retirada e mesa." },
        { id: "numeracao", icon: Hash, title: "Numeracao sequencial de pedidos", desc: "Ajuste a numeracao dos pedidos.", disabled: true },
        { id: "valor-minimo", icon: ListOrdered, title: "Valor mínimo do pedido", desc: "Defina valor mínimo para pedidos." },
        { id: "pedidos-agendados", icon: CalendarCheck, title: "Pedidos agendados", desc: "Veja o calendário e configure pedidos futuros." },
        { id: "taxa-entrega", icon: MapPin, title: "Taxa de entrega", desc: "Configure taxas por area e endereço." },
      ],
    },
    {
      title: "Integrações",
      cards: [
        { id: "ifood", icon: ShoppingCart, title: "iFood", desc: "Sincronize pedidos do marketplace.", disabled: true },
        { id: "facebook-pixel", icon: Webhook, title: "Facebook pixel", desc: "Acompanhe eventos do cardápio.", disabled: true },
      ],
    },
    {
      title: "Pedidos na mesa",
      cards: [{ id: "tela-mesa", icon: Table2, title: "Tela da mesa", desc: "Configure fluxo de pedido no salão.", disabled: true }],
    },
    {
      title: "Outros",
      cards: [
        { id: "impressao", icon: Printer, title: "Impressao", desc: "Perfis, formatos e impressoras." },
        { id: "balanca", icon: Scale, title: "Balança", desc: "Integracao com balança conectada.", disabled: true },
        { id: "eventos", icon: TrendingUp, title: "Eventos", desc: "Registros de eventos do dashboard.", disabled: true },
        { id: "versiculo-dashboard", icon: BookOpen, title: "Receber Versículo do dia", desc: "Mostrar o card do versículo no dashboard.", badge: "Novo" },
      ],
    },
  ];

  function abrirCard(id: string) {
    if (id === "versiculo-dashboard") return;
    if (id === "permissoes") {
      window.open(`${phpAdminUrl}/admin/permissoes.php`, "_blank");
      return;
    }
    if (id === "pedidos-agendados") {
      if (!pedidosAgendadosDisponivel) {
        toast.error("Pedidos agendados é exclusivo do plano Essencial.");
        return;
      }
      router.push("/scheduled-orders");
      return;
    }
    setAberto(id as CardId);
  }

  let indiceAnimacao = 0;

  return (
    <div className="mx-auto max-w-6xl space-y-10 min-[1800px]:max-w-none p-4 sm:p-6">
      <header className="relative overflow-hidden rounded-3xl border bg-linear-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Settings2 className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
            <p className="text-sm text-muted-foreground">Gerencie loja, pedidos, pagamentos e integrações.</p>
          </div>
        </div>
      </header>

      {sections.map((section) => {
        const SectionIcon = ICONE_SECAO[section.title] ?? Settings2;
        return (
          <section key={section.title} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SectionIcon className="size-3.5" />
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{section.title}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                {section.cards.length}
              </span>
              <div className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.cards.map((card) => {
                const Icon = card.icon;
                const isToggle = card.id === "versiculo-dashboard";
                const bloqueadoPorPlano = card.id === "pedidos-agendados" && !pedidosAgendadosDisponivel;
                const badge = bloqueadoPorPlano ? "Essencial" : card.badge;
                const clicavel = !card.disabled && !isToggle;
                const ativo = !card.disabled;
                const atraso = Math.min(indiceAnimacao++ * 35, 600);
                return (
                  <Card
                    key={card.id}
                    role={clicavel ? "button" : undefined}
                    tabIndex={clicavel ? 0 : undefined}
                    onMouseMove={ativo ? moverBrilho : undefined}
                    onKeyDown={
                      clicavel
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              abrirCard(card.id);
                            }
                          }
                        : undefined
                    }
                    style={{ animationDelay: `${atraso}ms` }}
                    className={`group relative flex min-h-24 flex-row items-start gap-3.5 rounded-2xl p-4 outline-none animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 ${
                      card.disabled
                        ? "opacity-55"
                        : `transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary/50 ${
                            clicavel ? "cursor-pointer" : ""
                          } ${bloqueadoPorPlano ? "opacity-80" : ""}`
                    }`}
                    onClick={() => clicavel && abrirCard(card.id)}
                  >
                    {ativo ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{
                          background:
                            "radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)",
                        }}
                      />
                    ) : null}
                    {badge ? (
                      <span
                        className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          badge === "Novo"
                            ? "bg-red-500 text-white shadow-sm shadow-red-500/30"
                            : "bg-primary/10 text-primary ring-1 ring-primary/15"
                        }`}
                      >
                        {badge}
                      </span>
                    ) : null}
                    {card.linkOut ? (
                      <ExternalLink className="absolute right-3 top-3 size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                    ) : null}
                    <div
                      className={`relative flex size-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                        card.disabled
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary ring-1 ring-primary/10 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/30 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110"
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="relative min-w-0 flex-1 pr-6">
                      <div className="text-sm font-semibold tracking-tight">{card.title}</div>
                      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.desc}</div>
                      {card.disabled && !isToggle ? (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <Clock className="size-3" /> Em breve
                        </div>
                      ) : bloqueadoPorPlano ? (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <Lock className="size-3" /> Disponível no plano Essencial
                        </div>
                      ) : null}
                    </div>
                    {isToggle ? (
                      <Switch
                        checked={versiculoAtivo}
                        onCheckedChange={alternarVersiculo}
                        disabled={salvandoVersiculo}
                        onClick={(e) => e.stopPropagation()}
                        className={`relative ${card.badge ? "mt-6" : ""}`}
                      />
                    ) : clicavel && !card.linkOut ? (
                      <ChevronRight
                        aria-hidden
                        className="absolute bottom-4 right-4 size-4 text-primary opacity-0 transition-all duration-300 motion-safe:-translate-x-2 group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    ) : null}
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      <LojaInfoDialog
        open={aberto === "loja-info"}
        onOpenChange={(v) => setAberto(v ? "loja-info" : null)}
        loja={dados.loja}
        lojaLinkBase={dados.loja_link_base}
        phpAdminUrl={phpAdminUrl}
        onSalvo={recarregar}
      />
      <MenuCustomDialog
        open={aberto === "menu-custom"}
        onOpenChange={(v) => setAberto(v ? "menu-custom" : null)}
        temaCorMenu={dados.loja.tema_cor_menu}
        onSalvo={recarregar}
      />
      <UsuariosDialog open={aberto === "usuarios"} onOpenChange={(v) => setAberto(v ? "usuarios" : null)} />
      <SeloVerificacaoDialog
        open={aberto === "selo-verificacao"}
        onOpenChange={(v) => setAberto(v ? "selo-verificacao" : null)}
        verificada={dados.loja.verificada}
        contato={dados.loja.contato}
        onSalvo={recarregar}
      />
      <HorariosDialog
        open={aberto === "horarios"}
        onOpenChange={(v) => setAberto(v ? "horarios" : null)}
        horarios={dados.horarios}
        onSalvo={recarregar}
      />
      <FusoHorarioDialog
        open={aberto === "fuso-horario"}
        onOpenChange={(v) => setAberto(v ? "fuso-horario" : null)}
        fuso={dados.fuso_horario}
        definido={dados.fuso_horario_definido}
        onSalvo={recarregar}
      />
      <PausaDialog open={aberto === "pausa"} onOpenChange={(v) => setAberto(v ? "pausa" : null)} />
      <FormasPagamentoDialog
        open={aberto === "formas-pagamento"}
        onOpenChange={(v) => setAberto(v ? "formas-pagamento" : null)}
        pagamento={dados.pagamento}
        onSalvo={recarregar}
      />
      <CashbackDialog
        open={aberto === "cashback"}
        onOpenChange={(v) => setAberto(v ? "cashback" : null)}
        cashback={dados.cashback}
        onSalvo={recarregar}
      />
      <ClubePontosDialog
        open={aberto === "clube-pontos"}
        onOpenChange={(v) => setAberto(v ? "clube-pontos" : null)}
        ativo={dados.clube_pontos_ativo}
        onSalvo={recarregar}
      />
      <ReceberPedidosDialog
        open={aberto === "receber-pedidos"}
        onOpenChange={(v) => setAberto(v ? "receber-pedidos" : null)}
        pedidos={dados.pedidos}
        onSalvo={recarregar}
      />
      <TiposPedidosDialog
        open={aberto === "tipos-pedidos"}
        onOpenChange={(v) => setAberto(v ? "tipos-pedidos" : null)}
        pedidos={dados.pedidos}
        onSalvo={recarregar}
      />
      <ValorMinimoDialog
        open={aberto === "valor-minimo"}
        onOpenChange={(v) => setAberto(v ? "valor-minimo" : null)}
        pedidos={dados.pedidos}
        onSalvo={recarregar}
      />
      <TaxaEntregaDialog
        open={aberto === "taxa-entrega"}
        onOpenChange={(v) => setAberto(v ? "taxa-entrega" : null)}
        taxaEntrega={dados.taxa_entrega}
        minimoEntrega={dados.pedidos.pedido_minimo_entrega_ativo ? dados.pedidos.pedido_minimo_entrega : 0}
        onSalvo={recarregar}
      />
      <ImpressaoDialog
        open={aberto === "impressao"}
        onOpenChange={(v) => setAberto(v ? "impressao" : null)}
        lojaNome={dados.loja.nome}
      />
      <CrossSellDialog
        open={aberto === "cross-sell"}
        onOpenChange={(v) => setAberto(v ? "cross-sell" : null)}
        ativo={dados.cross_sell_ativo}
        onSalvo={recarregar}
      />
    </div>
  );
}
