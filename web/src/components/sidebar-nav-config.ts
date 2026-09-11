import type { LucideIcon } from "lucide-react";
import {
  Home,
  ShoppingBag,
  Kanban,
  Receipt,
  FileText,
  Package,
  Gift,
  Boxes,
  Grid3x3,
  BarChart3,
  Users,
  Award,
  Shuffle,
  PieChart,
  ArrowLeftRight,
  Network,
  Landmark,
  CreditCard,
  Table,
  MessageCircle,
  Radio,
  Building2,
  Bike,
  Badge as BadgeIcon,
  Wallet,
  BookText,
  Ticket,
  Star,
  Settings,
} from "lucide-react";

export type NavItem = {
  menuKey: string | null; // null = sempre visivel (ex.: Avaliacoes, Assinatura)
  label: string;
  icon: LucideIcon;
  href: string; // caminho relativo (sem "/admin"); sem extensao, igual ao PHP
  migrated?: boolean; // true = ja existe como rota Next.js
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Acesso rápido",
    items: [
      { menuKey: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard", migrated: true },
    ],
  },
  {
    title: "Dia a dia",
    items: [
      { menuKey: "pdv", label: "Pedidos (PDV)", icon: ShoppingBag, href: "/pdv" },
      { menuKey: "gestor", label: "Gestor de Pedidos", icon: Kanban, href: "/ordermanager", migrated: true },
      { menuKey: "pedidos", label: "Lista de Pedidos", icon: Receipt, href: "/order-list", migrated: true },
      { menuKey: "orcamentos", label: "Orçamento/Recibo", icon: FileText, href: "/orcamentos" },
      { menuKey: "produtos", label: "Produtos", icon: Package, href: "/produtos", migrated: true },
      { menuKey: "promo", label: "Promo", icon: Gift, href: "/promotion", migrated: true },
      { menuKey: "estoque", label: "Estoque", icon: Boxes, href: "/stock", migrated: true },
      { menuKey: "clientes", label: "Clientes", icon: Grid3x3, href: "/clientes" },
    ],
  },
  {
    title: "Relatórios",
    items: [
      { menuKey: "relatorios", label: "Vendas", icon: BarChart3, href: "/relatorios" },
      { menuKey: "relatorios", label: "Relatório de clientes", icon: Users, href: "/relatorios_clientes" },
      { menuKey: "fidelidade", label: "Fidelidade", icon: Award, href: "/relatorios_fidelidade" },
      { menuKey: "crossSellRelatorio", label: "Cross-sell", icon: Shuffle, href: "/relatorio_cross_sell" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { menuKey: "financeiro", label: "Dashboard financeiro", icon: PieChart, href: "/financeiro_dashboard" },
      { menuKey: "financeiro", label: "Lançamentos", icon: ArrowLeftRight, href: "/financeiro_lancamentos" },
      { menuKey: "financeiro", label: "Categorias", icon: Network, href: "/financeiro_categorias" },
      { menuKey: "financeiro", label: "Contas", icon: Landmark, href: "/financeiro_contas" },
      { menuKey: "financeiro", label: "Formas de pagamento", icon: CreditCard, href: "/financeiro_formas_pagamento" },
      { menuKey: "financeiro", label: "DRE", icon: Table, href: "/financeiro_dre" },
    ],
  },
  {
    title: "Monitorar",
    items: [
      { menuKey: "whatslilly", label: "WhatsLilly", icon: MessageCircle, href: "/whatslilly" },
      { menuKey: "listaTransmissao", label: "Lista de Transmissão", icon: Radio, href: "/lista_transmissao" },
    ],
  },
  {
    title: "Gerenciar",
    items: [
      { menuKey: "gerenciamento", label: "Gerenciamento", icon: Building2, href: "/superadmin/dashboard" },
      { menuKey: "motoboys", label: "Motoboys", icon: Bike, href: "/motoboys" },
      { menuKey: "modoGarcom", label: "Modo Garçom", icon: BadgeIcon, href: "/modo_garcom" },
      { menuKey: "controleCaixa", label: "Controle de caixa", icon: Wallet, href: "/controle_caixa" },
      { menuKey: "controleFiado", label: "Controle de fiado", icon: BookText, href: "/controle_fiado" },
      { menuKey: "cupons", label: "Cupons", icon: Ticket, href: "/cupons" },
      { menuKey: null, label: "Avaliações", icon: Star, href: "/avaliacoes", migrated: true },
      { menuKey: null, label: "Assinatura", icon: CreditCard, href: "/plan-details" },
      { menuKey: "configuracoes", label: "Configurações", icon: Settings, href: "/configuracoes" },
    ],
  },
];

/** Lista achatada de todas as paginas visiveis para o admin, para a busca global do Dashboard. */
export function getSearchablePages(menu: Record<string, boolean>): NavItem[] {
  return NAV_SECTIONS.flatMap((section) =>
    section.items.filter((item) => item.menuKey === null || menu[item.menuKey])
  );
}
