import Link from "next/link";
import { BadgeCheck, Banknote, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { DashboardChart } from "@/components/dashboard-chart";

type DashboardResponse = {
  ok: true;
  periodo: 7 | 15 | 30;
  loja: { nome: string; verificada: boolean };
  kpis: {
    receita_mes_atual: number;
    faixa_receita_mes: string;
    pedidos_periodo: number;
    receita_periodo: number;
    clientes_cadastrados: number;
    acessos_menu: number;
  };
  grafico: {
    labels: string[];
    serie_pedidos: number[];
    serie_valores: number[];
  };
  top_produtos: {
    nome: string;
    valor: number;
    saidas: number;
    estoque: number;
  }[];
};

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const params = await searchParams;
  const periodo = params.periodo ?? "7";

  let data: DashboardResponse | null = null;
  let erro: string | null = null;

  try {
    data = await phpApiFetch<DashboardResponse>(
      `/admin/api/v1/dashboard.php?periodo=${encodeURIComponent(periodo)}`
    );
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o dashboard.";
  }

  if (erro || !data) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{data.loja.nome}</h1>
        {data.loja.verificada && <BadgeCheck className="text-primary" size={20} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Receita do mês atual</span>
            <Banknote className="text-primary" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatBRL(data.kpis.receita_mes_atual)}</div>
            <div className="text-xs text-muted-foreground">{data.kpis.faixa_receita_mes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Pedidos finalizados</span>
            <ShoppingBag className="text-primary" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{data.kpis.pedidos_periodo}</div>
            <div className="text-xs text-muted-foreground">nos últimos {data.periodo} dias</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Clientes cadastrados</span>
            <Users className="text-primary" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{data.kpis.clientes_cadastrados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Acessos ao cardápio</span>
            <TrendingUp className="text-primary" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{data.kpis.acessos_menu}</div>
            <div className="text-xs text-muted-foreground">este mês</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Desempenho</h2>
            <p className="text-xs text-muted-foreground">
              Pedidos recebidos nos últimos {data.periodo} dias
            </p>
          </div>
          <div className="flex items-center gap-1">
            {[7, 15, 30].map((p) => (
              <Link
                key={p}
                href={`/dashboard?periodo=${p}`}
                className={cn(
                  buttonVariants({ variant: p === data!.periodo ? "default" : "outline", size: "sm" })
                )}
              >
                {p}d
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <DashboardChart
            labels={data.grafico.labels}
            seriePedidos={data.grafico.serie_pedidos}
            serieValores={data.grafico.serie_valores}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Produtos com mais saída</h2>
          <p className="text-xs text-muted-foreground">Top 5 produtos com maior rotatividade</p>
        </CardHeader>
        <CardContent>
          {data.top_produtos.length > 0 ? (
            <div className="flex flex-col divide-y">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 pb-2 text-xs font-medium text-muted-foreground">
                <span>Produto</span>
                <span className="text-right">Valor</span>
                <span className="text-center">Saídas</span>
                <span className="text-right">Estoque</span>
              </div>
              {data.top_produtos.map((p, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-2.5 text-sm"
                >
                  <span className="truncate font-medium">{p.nome}</span>
                  <span className="text-right text-muted-foreground">{formatBRL(p.valor)}</span>
                  <span className="text-center text-muted-foreground">{p.saidas}</span>
                  <span
                    className={cn(
                      "text-right",
                      p.estoque <= 0 ? "font-medium text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {p.estoque}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Sem dados suficientes.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
