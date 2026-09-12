"use client";

import { useState } from "react";
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
import { PedidosAgendadosDialog } from "@/components/settings/pedidos-agendados-dialog";
import { TaxaEntregaDialog } from "@/components/settings/taxa-entrega-dialog";
import { ImpressaoDialog } from "@/components/settings/impressao-dialog";

type CardId =
  | "loja-info"
  | "menu-custom"
  | "usuarios"
  | "selo-verificacao"
  | "horarios"
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
  | "versiculo-dashboard";

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

export function SettingsManager({
  dadosIniciais,
  phpAdminUrl,
}: {
  dadosIniciais: ConfiguracoesDetalhe;
  phpAdminUrl: string;
}) {
  const [dados, setDados] = useState(dadosIniciais);
  const [aberto, setAberto] = useState<CardId | null>(null);
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
        { id: "pausa", icon: PauseCircle, title: "Pausa programada", desc: "Agende pausas automaticas da loja." },
        { id: "formas-pagamento", icon: CreditCard, title: "Formas de pagamento", desc: "Defina meios aceitos e taxas." },
      ],
    },
    {
      title: "Fidelidade",
      cards: [
        { id: "cashback", icon: Coins, title: "Cashback", desc: "Configure regras e percentual de retorno." },
        { id: "clube-pontos", icon: Sparkles, title: "Clube de pontos", desc: "Ative o programa de fidelidade por pontos." },
      ],
    },
    {
      title: "Pedidos",
      cards: [
        { id: "receber-pedidos", icon: Inbox, title: "Receber pedidos", desc: "Canais, alertas e regras de recebimento." },
        { id: "tipos-pedidos", icon: ShoppingBag, title: "Tipos de pedidos", desc: "Ative entrega, retirada e mesa." },
        { id: "numeracao", icon: Hash, title: "Numeracao sequencial de pedidos", desc: "Ajuste a numeracao dos pedidos.", disabled: true },
        { id: "valor-minimo", icon: ListOrdered, title: "Valor mínimo do pedido", desc: "Defina valor mínimo para pedidos." },
        { id: "pedidos-agendados", icon: CalendarCheck, title: "Pedidos agendados", desc: "Ative e configure pedidos futuros." },
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
        { id: "versiculo-dashboard", icon: BookOpen, title: "Receber Versículo do dia", desc: "Mostrar o card do versículo no dashboard." },
      ],
    },
  ];

  function abrirCard(id: string) {
    if (id === "versiculo-dashboard") return;
    if (id === "permissoes") {
      window.open(`${phpAdminUrl}/admin/permissoes.php`, "_blank");
      return;
    }
    setAberto(id as CardId);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie loja, pedidos, pagamentos e integrações.</p>
      </div>

      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{section.title}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.cards.map((card) => {
              const Icon = card.icon;
              const isToggle = card.id === "versiculo-dashboard";
              return (
                <Card
                  key={card.id}
                  className={`relative flex flex-row items-start gap-3 p-4 ${
                    card.disabled ? "opacity-60" : "cursor-pointer hover:border-primary/40"
                  }`}
                  onClick={() => !card.disabled && !isToggle && abrirCard(card.id)}
                >
                  {card.badge ? (
                    <span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {card.badge}
                    </span>
                  ) : null}
                  {card.linkOut ? (
                    <ExternalLink className="absolute right-3 top-3 size-3.5 text-muted-foreground" />
                  ) : null}
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="text-sm font-medium">{card.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{card.desc}</div>
                    {card.disabled && !isToggle ? (
                      <div className="mt-1.5 text-[11px] font-medium text-muted-foreground">Em breve</div>
                    ) : null}
                  </div>
                  {isToggle ? (
                    <Switch
                      checked={versiculoAtivo}
                      onCheckedChange={alternarVersiculo}
                      disabled={salvandoVersiculo}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>
      ))}

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
      <PedidosAgendadosDialog
        open={aberto === "pedidos-agendados"}
        onOpenChange={(v) => setAberto(v ? "pedidos-agendados" : null)}
        agendamento={dados.agendamento}
        onSalvo={recarregar}
      />
      <TaxaEntregaDialog
        open={aberto === "taxa-entrega"}
        onOpenChange={(v) => setAberto(v ? "taxa-entrega" : null)}
        taxaEntrega={dados.taxa_entrega}
        onSalvo={recarregar}
      />
      <ImpressaoDialog
        open={aberto === "impressao"}
        onOpenChange={(v) => setAberto(v ? "impressao" : null)}
        phpAdminUrl={phpAdminUrl}
      />
    </div>
  );
}
