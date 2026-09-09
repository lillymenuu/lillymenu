import { Card, CardContent, CardHeader } from "@/components/ui/card";

const CORES = ["#9c5523", "#b8703c", "#d18f5e", "#e8b587"];

function StageWave({ pct, color }: { pct: number; color: string }) {
  const w = 200;
  const h = 72;
  const startY = 8;
  const endY = h - 6 - (Math.max(0, Math.min(100, pct)) / 100) * (h - 24);
  const midX1 = w * 0.35;
  const midX2 = w * 0.65;
  const linePath = `M0,${startY} C${midX1},${startY} ${midX2},${endY} ${w},${endY}`;
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  const gradId = `funil-wave-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ConversionFunnel({
  visitas,
  views,
  carrinhos,
  pedidos,
  pctViews,
  pctCarrinhos,
  pctPedidos,
  conversao,
  dias,
}: {
  visitas: number;
  views: number;
  carrinhos: number;
  pedidos: number;
  pctViews: number;
  pctCarrinhos: number;
  pctPedidos: number;
  conversao: number;
  dias: number;
}) {
  const etapas = [
    { label: "Visitas", pct: 100, desc: `${visitas.toLocaleString("pt-BR")} acessos na sua loja` },
    { label: "Visualizações de itens", pct: pctViews, desc: `${views.toLocaleString("pt-BR")} pessoas visualizaram algum item` },
    { label: "Carrinho", pct: pctCarrinhos, desc: `${carrinhos.toLocaleString("pt-BR")} pessoas adicionaram algum item` },
    { label: "Pedidos", pct: pctPedidos, desc: `${pedidos.toLocaleString("pt-BR")} pessoas realizaram o pedido` },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">Funil de conversão</h2>
        {visitas > 0 && (
          <div className="shrink-0 rounded-xl border px-4 py-2.5 text-right">
            <div className="text-2xl leading-none font-bold tabular-nums text-primary">{conversao}%</div>
            <div className="mt-1 text-[11px] leading-tight text-muted-foreground">
              taxa de conversão
              <br />
              nos últimos {dias} dias
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {etapas.map((e, i) => {
            const cor = CORES[i];
            return (
              <div key={e.label} className="flex flex-col overflow-hidden rounded-xl border">
                <div className="p-4 pb-2">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{e.label}</span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary">
                      {e.pct}%
                    </span>
                  </div>
                  <p className="text-sm leading-snug text-foreground">{e.desc}</p>
                </div>
                <div className="mt-auto h-20">
                  <StageWave pct={e.pct} color={cor} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
