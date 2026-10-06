"use client";

import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  FileCheck2,
  Headset,
  Hourglass,
  Sparkles,
  Store,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { formatBRLMilhar } from "@/components/ordermanager/constants";
import { cn } from "cn";

export type SaDashboard = {
  admin: { nome: string };
  kpis: {
    total_lojas: number;
    lojas_ativas: number;
    receita_mes: number;
    lojas_trial: number;
    expira_7: number;
    expira_15: number;
    expira_30: number;
    expiradas: number;
    comprovantes_pendentes: number;
    outras: number;
    suporte_nao_lidas: number;
  };
  cadastros_mes: { mes: string; total: number }[];
  leads: { id: number; nome: string; contato: string; criado_em: string | null }[];
  destaque: { id: number; nome: string; plano: string; valor: number; status: string }[];
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/* Indigo: acento proprio do painel superadmin — decisao confirmada pelo usuario de dar a essa
   ferramenta interna uma identidade neutra separada da marca cobre voltada ao lojista (ver
   DESIGN.md > Admin). Nao mexe no token --primary global: so classes indigo-* aplicadas aqui. */
const INDIGO = "#4f46e5";
const COR_STATUS = { ativa: "#10b981", trial: "#f59e0b", expirada: "#f43f5e", outras: "#cbd5e1" };

function rotuloMes(chave: string) {
  const [ano, mes] = chave.split("-");
  return `${MESES[Number(mes) - 1] ?? mes}/${ano.slice(2)}`;
}

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

function dataCurta(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const chartConfig: ChartConfig = {
  total: { label: "Novas lojas", color: INDIGO },
  qtd: { label: "Lojas", color: INDIGO },
};

/** Variação percentual honesta mês a mês — null quando o mês anterior é 0 (percentual não informativo nesse caso). */
function variacaoMensal(serie: { total: number }[]): { percent: number | null; delta: number } {
  const atual = serie.at(-1)?.total ?? 0;
  const anterior = serie.at(-2)?.total ?? 0;
  const delta = atual - anterior;
  if (anterior === 0) return { percent: null, delta };
  return { percent: Math.round((delta / anterior) * 1000) / 10, delta };
}

function TrendBadge({ percent, delta }: { percent: number | null; delta: number }) {
  if (percent === null) {
    if (delta === 0) return null;
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
        <Sparkles size={11} /> {delta > 0 ? `+${delta}` : delta} vs mês passado
      </span>
    );
  }
  const subiu = percent >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        subiu ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      )}
    >
      {subiu ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(percent).toFixed(1)}% vs mês passado
    </span>
  );
}

function HeroStat({
  titulo,
  valor,
  legenda,
  icon: Icon,
  tom,
  trend,
  proporcao,
  href,
}: {
  titulo: string;
  valor: string | number;
  legenda: string;
  icon: LucideIcon;
  tom: string;
  trend?: { percent: number | null; delta: number };
  /** 0-1: quando presente, desenha uma barrinha de proporção (ex.: ativas/total) — dado real, nunca estimado. */
  proporcao?: number;
  href?: string;
}) {
  const corpo = (
    <Card className={cn("h-full transition-shadow", href && "hover:shadow-md")} data-size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tom)}>
            <Icon size={18} />
          </div>
          {trend && <TrendBadge percent={trend.percent} delta={trend.delta} />}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
          <p className="mt-1 text-[1.75rem] leading-none font-bold tabular-nums">{valor}</p>
        </div>
        {proporcao !== undefined ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.round(proporcao * 100)}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{legenda}</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{legenda}</p>
        )}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {corpo}
    </Link>
  ) : (
    corpo
  );
}

function AtencaoItem({
  titulo,
  valor,
  icon: Icon,
  tom,
  href,
}: {
  titulo: string;
  valor: string | number;
  icon: LucideIcon;
  tom: string;
  href?: string;
}) {
  const corpo = (
    <div className="flex items-center gap-3 py-3">
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tom)}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg leading-tight font-bold tabular-nums">{valor}</p>
        <p className="truncate text-xs text-muted-foreground">{titulo}</p>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-lg transition-colors hover:bg-muted/60">
      {corpo}
    </Link>
  ) : (
    corpo
  );
}

export function SaDashboardView({ dados }: { dados: SaDashboard }) {
  const { kpis } = dados;
  const nome = dados.admin.nome.split(" ")[0];

  const cadastros = dados.cadastros_mes.map((c) => ({ mes: rotuloMes(c.mes), total: c.total }));
  const trendCadastros = variacaoMensal(dados.cadastros_mes);
  const novasEsteMes = dados.cadastros_mes.at(-1)?.total ?? 0;

  const proporcaoAtivas = kpis.total_lojas > 0 ? kpis.lojas_ativas / kpis.total_lojas : 0;

  const status = [
    { name: "Ativas", value: kpis.lojas_ativas, fill: COR_STATUS.ativa },
    { name: "Em teste", value: kpis.lojas_trial, fill: COR_STATUS.trial },
    { name: "Expiradas", value: kpis.expiradas, fill: COR_STATUS.expirada },
    { name: "Outras", value: kpis.outras, fill: COR_STATUS.outras },
  ];

  const prazos = [
    { prazo: "7 dias", qtd: kpis.expira_7 },
    { prazo: "15 dias", qtd: kpis.expira_15 },
    { prazo: "30 dias", qtd: kpis.expira_30 },
    { prazo: "Expiradas", qtd: kpis.expiradas },
  ];

  const atencao = [
    { titulo: "Em teste", valor: kpis.lojas_trial, icon: Hourglass, tom: "bg-violet-50 text-violet-600", href: undefined },
    { titulo: "Expiram em 7 dias", valor: kpis.expira_7, icon: CalendarClock, tom: "bg-amber-50 text-amber-600", href: undefined },
    { titulo: "Expiram em 15 dias", valor: kpis.expira_15, icon: CalendarClock, tom: "bg-amber-50 text-amber-600", href: undefined },
    { titulo: "Expiram em 30 dias", valor: kpis.expira_30, icon: CalendarClock, tom: "bg-amber-50 text-amber-600", href: undefined },
    { titulo: "Expiradas", valor: kpis.expiradas, icon: AlertTriangle, tom: "bg-rose-50 text-rose-600", href: undefined },
    { titulo: "Comprovantes p/ revisar", valor: kpis.comprovantes_pendentes, icon: FileCheck2, tom: "bg-sky-50 text-sky-600", href: "/superadmin/lojas" },
    { titulo: "Suporte não lidas", valor: kpis.suporte_nao_lidas, icon: Headset, tom: "bg-indigo-50 text-indigo-600", href: "/superadmin/suporte" },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Olá, {nome}</h2>
        <p className="text-sm text-muted-foreground">Resumo da plataforma e das lojas cadastradas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <HeroStat
          titulo="Lojas ativas"
          valor={kpis.lojas_ativas}
          legenda={`${Math.round(proporcaoAtivas * 100)}% de ${kpis.total_lojas} cadastradas`}
          icon={Store}
          tom="bg-indigo-50 text-indigo-600"
          proporcao={proporcaoAtivas}
          href="/superadmin/lojas"
        />
        <HeroStat
          titulo="Receita prevista / mês"
          valor={formatBRLMilhar(kpis.receita_mes)}
          legenda="Soma dos planos ativos"
          icon={TrendingUp}
          tom="bg-emerald-50 text-emerald-600"
        />
        <HeroStat
          titulo="Novas lojas este mês"
          valor={novasEsteMes}
          legenda="Cadastros neste mês"
          icon={Sparkles}
          tom="bg-violet-50 text-violet-600"
          trend={trendCadastros}
        />
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold">Precisa de atenção</h3>
          <p className="text-xs text-muted-foreground">Prazos e pendências que pedem uma ação sua</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            {atencao.map((item) => (
              <AtencaoItem key={item.titulo} {...item} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Novas lojas por mês</h3>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Últimos 12 meses
              {trendCadastros.percent !== null && (
                <span className={cn("inline-flex items-center gap-0.5 font-medium", trendCadastros.percent >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  · {trendCadastros.percent >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {trendCadastros.percent >= 0 ? "alta" : "queda"} de {Math.abs(trendCadastros.percent).toFixed(1)}% este mês
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
              <AreaChart data={cadastros} margin={{ top: 12, left: -20, right: 8 }}>
                <defs>
                  <linearGradient id="saCadastros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={INDIGO} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={INDIGO} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip cursor={{ stroke: INDIGO, strokeOpacity: 0.3 }} formatter={(v) => [v, "Novas lojas"]} />
                <Area dataKey="total" type="monotone" stroke={INDIGO} strokeWidth={2.5} fill="url(#saCadastros)" dot={{ r: 3, fill: "#fff", stroke: INDIGO, strokeWidth: 2 }} animationDuration={800} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Lojas por status</h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="relative mx-auto aspect-square w-full max-w-[210px]">
              <ChartContainer config={chartConfig} className="aspect-square w-full">
                <PieChart>
                  <Pie data={status} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="95%" paddingAngle={3} cornerRadius={6} stroke="none" animationDuration={900} />
                  <Tooltip />
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums">{kpis.total_lojas}</span>
                <span className="text-xs text-muted-foreground">Lojas</span>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {status.map((s) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: s.fill }} />
                  <span className="flex-1 text-muted-foreground">{s.name}</span>
                  <span className="font-semibold tabular-nums">{s.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Prazos de vencimento</h3>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-52 w-full">
              <BarChart data={prazos} margin={{ top: 8, left: -24, right: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="prazo" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip cursor={{ fill: "rgba(79,70,229,.08)" }} formatter={(v) => [v, "Lojas"]} />
                <Bar dataKey="qtd" fill={INDIGO} radius={[6, 6, 0, 0]} maxBarSize={44} animationDuration={800} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Lojas em destaque</h3>
            <p className="text-xs text-muted-foreground">Maior receita</p>
          </CardHeader>
          <CardContent>
            {dados.destaque.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma loja cadastrada.</p>
            ) : (
              <ul className="flex flex-col">
                {dados.destaque.map((l, i) => (
                  <li key={l.id}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center gap-3 py-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{iniciais(l.nome)}</div>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-sm font-medium">{l.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">{l.plano}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{formatBRLMilhar(l.valor)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Leads recentes</h3>
            <p className="text-xs text-muted-foreground">Últimos cadastros na landing</p>
          </CardHeader>
          <CardContent>
            {dados.leads.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lead recente.</p>
            ) : (
              <ul className="flex flex-col">
                {dados.leads.map((l, i) => (
                  <li key={l.id}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center gap-3 py-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{iniciais(l.nome)}</div>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-sm font-medium">{l.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">{l.contato}</p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{dataCurta(l.criado_em)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
