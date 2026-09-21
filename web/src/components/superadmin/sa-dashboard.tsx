"use client";

import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CalendarClock, FileCheck2, Headset, Hourglass, Store, TrendingUp, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

const COR_STATUS = { ativa: "#10b981", trial: "#f59e0b", expirada: "#f43f5e", outras: "#cbd5e1" };

const chartConfig: ChartConfig = {
  total: { label: "Novas lojas", color: "#9c5523" },
  qtd: { label: "Lojas", color: "#9c5523" },
};

function Kpi({
  titulo,
  valor,
  extra,
  icon: Icon,
  tom,
  href,
}: {
  titulo: string;
  valor: string | number;
  extra: string;
  icon: LucideIcon;
  tom: string;
  href?: string;
}) {
  const corpo = (
    <Card className={cn("h-full transition-shadow", href && "hover:shadow-md")}>
      <CardContent className="flex items-start gap-4 pt-1">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tom)}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
          <p className="mt-0.5 text-2xl leading-tight font-bold tabular-nums">{valor}</p>
          <p className="text-xs text-muted-foreground">{extra}</p>
        </div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
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
  const novasNoPeriodo = dados.cadastros_mes.reduce((s, c) => s + c.total, 0);

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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Olá, {nome}</h2>
        <p className="text-sm text-muted-foreground">Resumo da plataforma e das lojas cadastradas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Lojas ativas" valor={kpis.lojas_ativas} extra={`de ${kpis.total_lojas} cadastradas`} icon={Store} tom="bg-sky-100 text-sky-600" href="/superadmin/lojas" />
        <Kpi titulo="Receita prevista / mês" valor={formatBRLMilhar(kpis.receita_mes)} extra="Soma dos planos ativos" icon={TrendingUp} tom="bg-emerald-100 text-emerald-600" />
        <Kpi titulo="Lojas em teste" valor={kpis.lojas_trial} extra="Período de teste grátis" icon={Hourglass} tom="bg-violet-100 text-violet-600" />
        <Kpi titulo="Expiram em 7 dias" valor={kpis.expira_7} extra="Vencem nesta semana" icon={CalendarClock} tom="bg-amber-100 text-amber-600" />
        <Kpi titulo="Expiradas" valor={kpis.expiradas} extra="Lojas com prazo vencido" icon={AlertTriangle} tom="bg-rose-100 text-rose-600" />
        <Kpi titulo="Comprovantes p/ revisar" valor={kpis.comprovantes_pendentes} extra="Aguardando aprovação" icon={FileCheck2} tom="bg-slate-200 text-slate-600" href="/superadmin/lojas" />
        <Kpi titulo="Suporte" valor={kpis.suporte_nao_lidas} extra="Mensagens não lidas" icon={Headset} tom="bg-emerald-100 text-emerald-600" href="/superadmin/suporte" />
        <Kpi titulo="Novas lojas (12 meses)" valor={novasNoPeriodo} extra="Cadastros no período" icon={Store} tom="bg-orange-100 text-orange-700" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Novas lojas por mês</h3>
            <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
              <AreaChart data={cadastros} margin={{ top: 12, left: -20, right: 8 }}>
                <defs>
                  <linearGradient id="saCadastros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9c5523" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#9c5523" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip cursor={{ stroke: "#9c5523", strokeOpacity: 0.3 }} formatter={(v) => [v, "Novas lojas"]} />
                <Area dataKey="total" type="monotone" stroke="#9c5523" strokeWidth={2.5} fill="url(#saCadastros)" dot={{ r: 3, fill: "#fff", stroke: "#9c5523", strokeWidth: 2 }} animationDuration={800} />
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
                <Tooltip cursor={{ fill: "rgba(156,85,35,.08)" }} formatter={(v) => [v, "Lojas"]} />
                <Bar dataKey="qtd" fill="#9c5523" radius={[6, 6, 0, 0]} maxBarSize={44} animationDuration={800} />
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
              <ul className="flex flex-col gap-3">
                {dados.destaque.map((l) => (
                  <li key={l.id} className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{iniciais(l.nome)}</div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-sm font-medium">{l.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{l.plano}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatBRLMilhar(l.valor)}</span>
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
              <ul className="flex flex-col gap-3">
                {dados.leads.map((l) => (
                  <li key={l.id} className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{iniciais(l.nome)}</div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-sm font-medium">{l.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{l.contato}</p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{dataCurta(l.criado_em)}</span>
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
