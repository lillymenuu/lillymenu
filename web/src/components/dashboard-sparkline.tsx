"use client";

import { useId } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "cn";

export function DashboardSparkline({
  series,
  height = 40,
  className,
}: {
  series: { data: number[]; color: string }[];
  height?: number;
  className?: string;
}) {
  const uid = useId();
  const tamanho = series[0]?.data.length ?? 0;
  const pontos = Array.from({ length: tamanho }, (_, i) => {
    const linha: Record<string, number> = { i };
    series.forEach((s, idx) => {
      linha[`s${idx}`] = s.data[i] ?? 0;
    });
    return linha;
  });

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pontos} margin={{ top: 4, right: 1, bottom: 0, left: 1 }}>
          <defs>
            {series.map((s, idx) => (
              <linearGradient key={idx} id={`${uid}-grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {series.map((s, idx) => (
            <Area
              key={idx}
              type="monotone"
              dataKey={`s${idx}`}
              stroke={s.color}
              strokeWidth={1.75}
              fill={`url(#${uid}-grad-${idx})`}
              isAnimationActive={false}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
