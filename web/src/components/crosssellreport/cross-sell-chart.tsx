"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatBRL } from "@/components/ordermanager/constants";
import type { CrossSellPorDia } from "@/lib/crossSellReport";

const chartConfig: ChartConfig = {
  valor: { label: "Faturamento cross-sell", color: "#9c5523" },
};

function formatDiaCurto(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export function CrossSellChart({ dados }: { dados: CrossSellPorDia[] }) {
  if (dados.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Faturamento de cross-sell por dia</h3>
        <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</p>
      </div>
    );
  }

  const data = dados.map((d) => ({ dia: formatDiaCurto(d.dia), valor: d.valor }));

  return (
    <div className="flex flex-col gap-1">
      <div>
        <h3 className="text-sm font-semibold">Faturamento de cross-sell por dia</h3>
        <p className="text-xs text-muted-foreground">Evolução do valor gerado no período</p>
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
        <AreaChart data={data} margin={{ top: 8, left: 4, right: 4 }}>
          <defs>
            <linearGradient id="fillCrossSell" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9c5523" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#9c5523" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="dia" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatBRL(Number(value))} />} />
          <Area
            dataKey="valor"
            type="natural"
            fill="url(#fillCrossSell)"
            stroke="#9c5523"
            strokeWidth={2.5}
            isAnimationActive
            animationDuration={500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
