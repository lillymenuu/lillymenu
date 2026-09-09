import { Users, Eye, ShoppingCart, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const CORES = ["#9c5523", "#b8703c", "#d18f5e", "#e8b587"];
const ICONES = [Users, Eye, ShoppingCart, CheckCircle2];

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
    { label: "Visitas", val: visitas, pct: 100, desc: `${visitas.toLocaleString("pt-BR")} acessos na sua loja` },
    { label: "Visualizações de itens", val: views, pct: pctViews, desc: `${views.toLocaleString("pt-BR")} pessoas visualizaram algum item` },
    { label: "Carrinho", val: carrinhos, pct: pctCarrinhos, desc: `${carrinhos.toLocaleString("pt-BR")} pessoas adicionaram algum item` },
    { label: "Pedidos", val: pedidos, pct: pctPedidos, desc: `${pedidos.toLocaleString("pt-BR")} pessoas realizaram o pedido` },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-sm font-semibold">Funil de conversão</h2>
        {visitas > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-linear-to-r from-primary/12 to-primary/5 py-1 pr-3 pl-2.5 ring-1 ring-primary/15">
            <span className="text-sm font-bold tabular-nums text-primary">{conversao}%</span>
            <span className="text-[11px] text-muted-foreground">conversão · últimos {dias} dias</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {etapas.map((e, i) => {
            const Icon = ICONES[i];
            const cor = CORES[i];
            return (
              <div
                key={e.label}
                className="relative overflow-hidden rounded-xl border p-4 transition-shadow duration-300 hover:shadow-[0_8px_20px_-8px_rgba(156,85,35,0.35)]"
                style={{ background: `linear-gradient(165deg, color-mix(in srgb, ${cor} 6%, var(--card)) 0%, var(--card) 55%)` }}
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <span
                    className="flex size-7 items-center justify-center rounded-lg"
                    style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor }}
                  >
                    <Icon size={14} strokeWidth={2.25} />
                  </span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: cor }}>
                    {e.pct}%
                  </span>
                </div>
                <div className="mb-0.5 text-2xl font-bold tabular-nums tracking-tight">
                  {e.val.toLocaleString("pt-BR")}
                </div>
                <div className="mb-3 text-xs font-medium text-muted-foreground">{e.label}</div>
                <div className="relative mb-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="relative h-full origin-left rounded-full"
                    style={{
                      width: `${e.pct}%`,
                      background: `linear-gradient(90deg, ${cor}, color-mix(in srgb, ${cor}, white 35%))`,
                      animation: `funil-fill 900ms cubic-bezier(0.22,1,0.36,1) ${i * 110}ms both`,
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-[3px] rounded-full bg-white/35" />
                  </div>
                </div>
                <div className="text-[11px] leading-snug text-muted-foreground">{e.desc}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
