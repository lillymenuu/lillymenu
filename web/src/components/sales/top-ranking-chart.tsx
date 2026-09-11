"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const COR = "#9c5523";

function truncar(texto: string, max = 20) {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EixoNomeTick(props: any) {
  const { x, y, payload } = props;
  if (x == null || y == null || !payload) return null;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} className="fill-foreground">
      {truncar(String(payload.value ?? ""))}
    </text>
  );
}

export function TopRankingChart({
  titulo,
  subtitulo,
  dados,
  valorLabel,
  formatarValor = (v: number) => String(v),
}: {
  titulo: string;
  subtitulo?: string;
  dados: { nome: string; valor: number }[];
  valorLabel: string;
  formatarValor?: (v: number) => string;
}) {
  const chartConfig: ChartConfig = {
    valor: { label: valorLabel, color: COR },
  };

  if (dados.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</p>
      </div>
    );
  }

  const altura = Math.max(120, dados.length * 34 + 16);

  return (
    <div className="flex flex-col gap-1">
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height: altura }}>
        <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 4 }} barCategoryGap={10}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nome"
            width={140}
            tickLine={false}
            axisLine={false}
            tick={EixoNomeTick}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={<ChartTooltipContent formatter={(value) => formatarValor(Number(value))} />}
          />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {dados.map((_, i) => (
              <Cell key={i} fill={COR} />
            ))}
            <LabelList
              dataKey="valor"
              position="right"
              formatter={(v: unknown) => formatarValor(Number(v))}
              className="fill-foreground text-[11px] font-medium"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
