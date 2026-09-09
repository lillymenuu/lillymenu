const CORES = ["#9c5523", "#b8703c", "#d18f5e", "#e8b587"];

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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Funil de conversão</h2>
        {visitas > 0 && (
          <div className="flex items-baseline gap-1.5 text-sm">
            <span className="font-bold text-primary">{conversao}%</span>
            <span className="text-xs text-muted-foreground">taxa de conversão · últimos {dias} dias</span>
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {etapas.map((e, i) => (
          <div key={e.label} className="rounded-xl border p-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{e.label}</span>
              <span className="font-semibold" style={{ color: CORES[i] }}>
                {e.pct}%
              </span>
            </div>
            <div className="mb-2 text-xl font-bold">{e.val.toLocaleString("pt-BR")}</div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${e.pct}%`, background: CORES[i] }}
              />
            </div>
            <div className="text-xs text-muted-foreground">{e.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
