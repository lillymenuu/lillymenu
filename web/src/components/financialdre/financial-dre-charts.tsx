"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { formatBRLMilhar } from "@/components/ordermanager/constants";
import { MESES_ABREV } from "@/lib/financeiroDre";
import type { FinanceiroDreMes } from "@/lib/financeiroDre";
import { cn } from "cn";

const COR_RECEITA = "#10b981";
const COR_DESPESA = "#ef4444";
const COR_LUCRO = "#9c5523";
const CORES_TRIMESTRE = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];

const compacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

type TooltipItem = { name?: string | number; value?: number | string; color?: string; payload?: { fill?: string } };

/** Caixinha de tooltip padrao dos 4 graficos. */
function TooltipBox({
  active,
  payload,
  label,
  formatar,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
  formatar: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label !== undefined && <div className="mb-1.5 font-semibold">{label}</div>}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: p.color ?? p.payload?.fill }} />
              {p.name}
            </span>
            <span className="font-semibold tabular-nums">{formatar(Number(p.value))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  titulo,
  descricao,
  atraso,
  children,
}: {
  titulo: string;
  descricao: string;
  atraso: number;
  children: ReactNode;
}) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisivel(true), atraso);
    return () => clearTimeout(t);
  }, [atraso]);
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all duration-700 ease-out",
        visivel ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      <h2 className="text-sm font-semibold">{titulo}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{descricao}</p>
      {children}
    </section>
  );
}

function SemDados() {
  return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Sem movimentação neste ano.</div>;
}

function Legenda({ itens }: { itens: { nome: string; valor: number; cor: string; pct?: number }[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-xs">
      {itens.map((i) => (
        <li key={i.nome} className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: i.cor }} />
          <span className="flex-1">{i.nome}</span>
          {i.pct !== undefined && <span className="text-muted-foreground tabular-nums">{pct(i.pct)}</span>}
          <span className="w-28 text-right font-medium tabular-nums">{formatBRLMilhar(i.valor)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Rotulo com o percentual dentro da fatia (so nas fatias grandes o bastante). */
function rotuloFatia(props: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number }) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
  if (percent < 0.06) return null;
  const rad = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.6;
  return (
    <text x={cx + r * Math.cos(-midAngle * rad)} y={cy + r * Math.sin(-midAngle * rad)} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {Math.round(percent * 100)}%
    </text>
  );
}

export function FinancialDreCharts({ meses, carregando }: { meses: FinanceiroDreMes[]; carregando: boolean }) {
  const totalReceita = meses.reduce((s, m) => s + m.total_income, 0);
  const totalDespesa = meses.reduce((s, m) => s + m.total_expense, 0);
  const totalLucro = totalReceita - totalDespesa;
  const margemAnual = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;
  const temDados = totalReceita > 0 || totalDespesa > 0;

  const porMes = meses.map((m, i) => ({
    mes: MESES_ABREV[i + 1],
    Receita: m.total_income,
    Despesas: m.total_expense,
    Lucro: m.profit_or_loss,
    Margem: m.margin_percent,
  }));

  /* Rosca: de onde a receita foi (despesas x lucro). Prejuizo = so a fatia de despesas. */
  const composicao = [
    { name: "Despesas", value: totalDespesa, fill: COR_DESPESA },
    { name: "Lucro", value: Math.max(0, totalLucro), fill: COR_LUCRO },
  ].filter((f) => f.value > 0);
  const baseComposicao = composicao.reduce((s, f) => s + f.value, 0);

  /* Pizza: receita por trimestre. */
  const trimestres = [0, 1, 2, 3].map((t) => ({
    name: `${t + 1}º trimestre`,
    value: meses.slice(t * 3, t * 3 + 3).reduce((s, m) => s + m.total_income, 0),
    fill: CORES_TRIMESTRE[t],
  }));
  const baseTrimestres = trimestres.reduce((s, t) => s + t.value, 0);

  const config = { Receita: { label: "Receita", color: COR_RECEITA }, Despesas: { label: "Despesas", color: COR_DESPESA }, Lucro: { label: "Lucro", color: COR_LUCRO } };

  const kpis = [
    { titulo: "Receita bruta", valor: formatBRLMilhar(totalReceita), cor: "text-emerald-600" },
    { titulo: "Despesas", valor: formatBRLMilhar(totalDespesa), cor: "text-destructive" },
    { titulo: "Lucro líquido", valor: formatBRLMilhar(totalLucro), cor: totalLucro < 0 ? "text-destructive" : "text-emerald-600" },
    { titulo: "Margem anual", valor: pct(margemAnual), cor: "text-foreground" },
  ];

  return (
    <div className={cn("space-y-4 transition-opacity duration-200", carregando && "opacity-60")}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.titulo} className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <div className="text-xs text-muted-foreground">{k.titulo}</div>
            <div className={cn("mt-1 text-lg font-semibold tabular-nums", k.cor)}>{k.valor}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1. Rosca */}
        <ChartCard titulo="Composição da receita" descricao="Quanto da receita bruta virou despesa e quanto virou lucro." atraso={0}>
          {!temDados || baseComposicao === 0 ? (
            <SemDados />
          ) : (
            <>
              <div className="relative">
                <ChartContainer config={config} className="aspect-auto h-60 w-full">
                  <PieChart>
                    <Tooltip content={<TooltipBox formatar={formatBRLMilhar} />} />
                    <Pie data={composicao} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={3} cornerRadius={6} stroke="none" animationDuration={1000} />
                  </PieChart>
                </ChartContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground">Margem anual</span>
                  <span className={cn("text-2xl font-bold tabular-nums", totalLucro < 0 ? "text-destructive" : "text-emerald-600")}>{pct(margemAnual)}</span>
                </div>
              </div>
              <Legenda
                itens={[
                  { nome: "Despesas", valor: totalDespesa, cor: COR_DESPESA, pct: (totalDespesa / baseComposicao) * 100 },
                  ...(totalLucro > 0 ? [{ nome: "Lucro", valor: totalLucro, cor: COR_LUCRO, pct: (totalLucro / baseComposicao) * 100 }] : []),
                  ...(totalLucro < 0 ? [{ nome: "Prejuízo no ano", valor: totalLucro, cor: COR_DESPESA }] : []),
                ]}
              />
            </>
          )}
        </ChartCard>

        {/* 2. Pizza */}
        <ChartCard titulo="Receita por trimestre" descricao="Como a receita bruta se distribuiu ao longo do ano." atraso={120}>
          {baseTrimestres === 0 ? (
            <SemDados />
          ) : (
            <>
              <ChartContainer config={config} className="aspect-auto h-60 w-full">
                <PieChart>
                  <Tooltip content={<TooltipBox formatar={formatBRLMilhar} />} />
                  <Pie data={trimestres} dataKey="value" nameKey="name" outerRadius="92%" paddingAngle={2} stroke="#fff" strokeWidth={2} label={rotuloFatia} labelLine={false} animationDuration={1000} />
                </PieChart>
              </ChartContainer>
              <Legenda itens={trimestres.map((t) => ({ nome: t.name, valor: t.value, cor: t.fill, pct: (t.value / baseTrimestres) * 100 }))} />
            </>
          )}
        </ChartCard>

        {/* 3. Linhas: receita x despesas x lucro */}
        <ChartCard titulo="Receita, despesas e lucro por mês" descricao="Evolução mensal dos três indicadores no ano." atraso={240}>
          {!temDados ? (
            <SemDados />
          ) : (
            <ChartContainer config={config} className="aspect-auto h-72 w-full">
              <LineChart data={porMes} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => compacto.format(v)} />
                <Tooltip content={<TooltipBox formatar={formatBRLMilhar} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Receita" stroke={COR_RECEITA} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={1200} />
                <Line type="monotone" dataKey="Despesas" stroke={COR_DESPESA} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={1200} animationBegin={150} />
                <Line type="monotone" dataKey="Lucro" stroke={COR_LUCRO} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={1200} animationBegin={300} />
              </LineChart>
            </ChartContainer>
          )}
        </ChartCard>

        {/* 4. Linha: margem */}
        <ChartCard titulo="Margem de lucro por mês" descricao="Percentual do lucro sobre a receita em cada mês." atraso={360}>
          {!temDados ? (
            <SemDados />
          ) : (
            <ChartContainer config={{ Margem: { label: "Margem", color: COR_LUCRO } }} className="aspect-auto h-72 w-full">
              <AreaChart data={porMes} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dre-margem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COR_LUCRO} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COR_LUCRO} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `${Math.round(v)}%`} />
                <ReferenceLine y={0} stroke="#a3a3a3" strokeDasharray="4 4" />
                <Tooltip content={<TooltipBox formatar={pct} />} />
                <Area type="monotone" dataKey="Margem" stroke={COR_LUCRO} strokeWidth={2.5} fill="url(#dre-margem)" dot={{ r: 3, fill: COR_LUCRO }} activeDot={{ r: 5 }} animationDuration={1200} />
              </AreaChart>
            </ChartContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
