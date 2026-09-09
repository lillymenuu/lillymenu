"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "cn";

type Metric = "pedidos" | "faturamento";

const chartConfig: ChartConfig = {
  pedidos: { label: "Pedidos", color: "#9c5523" },
  faturamento: { label: "Faturamento", color: "#9c5523" },
};

export function DashboardChart({
  labels,
  seriePedidos,
  serieValores,
}: {
  labels: string[];
  seriePedidos: number[];
  serieValores: number[];
}) {
  const [metric, setMetric] = useState<Metric>("pedidos");

  const data = labels.map((dia, i) => ({
    dia,
    pedidos: seriePedidos[i] ?? 0,
    faturamento: serieValores[i] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 self-end rounded-lg border p-0.5 text-xs">
        <button
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            metric === "pedidos" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
          onClick={() => setMetric("pedidos")}
        >
          Nº de pedidos
        </button>
        <button
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            metric === "faturamento" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
          onClick={() => setMetric("faturamento")}
        >
          Faturamento
        </button>
      </div>

      <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
        <AreaChart data={data} margin={{ left: 4, right: 4 }}>
          <defs>
            <linearGradient id="fillMetric" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9c5523" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#9c5523" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="dia" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) =>
                  metric === "faturamento"
                    ? `R$ ${Number(value).toFixed(2).replace(".", ",")}`
                    : String(value)
                }
              />
            }
          />
          <Area
            dataKey={metric}
            type="monotone"
            fill="url(#fillMetric)"
            stroke="#9c5523"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
