"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "cn";

type Metric = "pedidos" | "faturamento";

const chartConfig: ChartConfig = {
  pedidos: { label: "Pedidos", color: "#9c5523" },
  faturamento: { label: "Faturamento", color: "#9c5523" },
};

const PERIODOS: Record<string, string> = {
  "7": "Últimos 7 dias",
  "15": "Últimos 15 dias",
  "30": "Últimos 30 dias",
};

const METRICAS: Record<Metric, string> = {
  pedidos: "Número de pedidos",
  faturamento: "Faturamento",
};

function formatarValor(metric: Metric, v: number) {
  return metric === "faturamento" ? `R$ ${v.toFixed(0)}` : String(v);
}

type DotProps = { cx?: number; cy?: number; value?: number; index?: number };

function renderValueBubble(metric: Metric) {
  return function ValueBubble({ cx, cy, value, index }: DotProps) {
    if (cx == null || cy == null || value == null) return null;
    const texto = formatarValor(metric, value);
    const largura = Math.max(24, texto.length * 6.5 + 14);
    return (
      <g key={`bubble-${index}`}>
        <rect x={cx - largura / 2} y={cy - 28} width={largura} height={18} rx={9} fill="#9c5523" />
        <text x={cx} y={cy - 19} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight={700} fill="#fff">
          {texto}
        </text>
        <circle cx={cx} cy={cy} r={3.5} fill="#fff" stroke="#9c5523" strokeWidth={2} />
      </g>
    );
  };
}

export function DashboardChart({
  periodo,
  labels,
  seriePedidos,
  serieValores,
}: {
  periodo: 7 | 15 | 30;
  labels: string[];
  seriePedidos: number[];
  serieValores: number[];
}) {
  const [metric, setMetric] = useState<Metric>("pedidos");
  const [periodoAtual, setPeriodoAtual] = useState(periodo);
  const [grafico, setGrafico] = useState({ labels, seriePedidos, serieValores });
  const [carregando, setCarregando] = useState(false);

  async function trocarPeriodo(v: string) {
    const novoPeriodo = Number(v) as 7 | 15 | 30;
    if (novoPeriodo === periodoAtual) return;
    setCarregando(true);
    try {
      const res = await fetch(`/api/dashboard-grafico?periodo=${novoPeriodo}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setGrafico({
          labels: data.grafico.labels,
          seriePedidos: data.grafico.serie_pedidos,
          serieValores: data.grafico.serie_valores,
        });
        setPeriodoAtual(novoPeriodo);
      }
    } finally {
      setCarregando(false);
    }
  }

  const data = grafico.labels.map((dia, i) => ({
    dia,
    pedidos: grafico.seriePedidos[i] ?? 0,
    faturamento: grafico.serieValores[i] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Você está vendo {metric === "faturamento" ? "o faturamento" : "os pedidos recebidos"} na sua
          loja nos últimos {periodoAtual} dias
        </p>
        <div className="flex items-center gap-2">
          <Select items={PERIODOS} value={String(periodoAtual)} onValueChange={(v) => v && trocarPeriodo(v)}>
            <SelectTrigger size="sm" className="rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERIODOS).map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select items={METRICAS} value={metric} onValueChange={(v) => v && setMetric(v as Metric)}>
            <SelectTrigger size="sm" className="rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METRICAS).map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ChartContainer
        config={chartConfig}
        className={cn("aspect-auto h-64 w-full transition-opacity duration-300 ease-out", carregando && "opacity-40")}
      >
        <AreaChart data={data} margin={{ top: 32, left: 4, right: 4 }}>
          <defs>
            <linearGradient id="fillMetric" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9c5523" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#9c5523" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="dia" tickLine={false} axisLine={false} tickMargin={8} />
          <Area
            key={periodoAtual}
            dataKey={metric}
            type="natural"
            fill="url(#fillMetric)"
            stroke="#9c5523"
            strokeWidth={2.5}
            dot={renderValueBubble(metric)}
            activeDot={false}
            isAnimationActive
            animationDuration={500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
