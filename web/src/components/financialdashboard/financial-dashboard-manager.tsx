"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Wallet, Percent } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/components/ordermanager/constants";
import { MESES_LABEL, DONUT_CORES, DESPESA_COR } from "@/lib/financeiroDashboard";
import type { FinanceiroDashboardResposta } from "@/lib/financeiroDashboard";

function num(v: string | number): number {
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

function KpiTile({
  titulo,
  valor,
  icon: Icon,
  tone,
}: {
  titulo: string;
  valor: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "positive" | "negative";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{titulo}</div>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div
        className={`mt-1 text-xl font-semibold ${
          tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-destructive" : ""
        }`}
      >
        {valor}
      </div>
    </Card>
  );
}

export function FinancialDashboardManager({ dadosIniciais }: { dadosIniciais: FinanceiroDashboardResposta }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);

  async function carregar(mes: number, ano: number) {
    setCarregando(true);
    try {
      const res = await fetch(`/api/financialdashboard?mes=${mes}&ano=${ano}`);
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar o dashboard financeiro.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar o dashboard financeiro.");
    } finally {
      setCarregando(false);
    }
  }

  const { resumo_mensal: resumo, dashboard, dre } = dados;
  const contas = dashboard.accounts;
  const porPagamento = dashboard.income_by_payment_method;
  const porCategoria = dashboard.expense_by_category;

  const totalIncome = num(resumo.total_income);
  const totalExpense = num(resumo.total_expense);
  const saldo = totalIncome - totalExpense;
  const grandPie = totalIncome + totalExpense;

  type Fatia = { label: string; valor: number; cor: string; tipo: "income" | "expense" };
  const fatias: Fatia[] = porPagamento.map((p, i) => ({
    label: p.payment_method,
    valor: num(p.total),
    cor: DONUT_CORES[i % DONUT_CORES.length],
    tipo: "income",
  }));
  if (totalExpense > 0) {
    fatias.push({ label: "Despesas", valor: totalExpense, cor: DESPESA_COR, tipo: "expense" });
  }

  let acumulado = 0;
  const gradientStops: string[] = [];
  fatias.forEach((f) => {
    const pct = grandPie > 0 ? (f.valor / grandPie) * 100 : 0;
    const inicio = acumulado;
    const fim = acumulado + pct;
    gradientStops.push(`${f.cor} ${inicio}% ${fim}%`);
    acumulado = fim;
  });
  const conicGradient = gradientStops.length ? `conic-gradient(${gradientStops.join(", ")})` : "conic-gradient(#e5e7eb 0% 100%)";

  const maxPagamento = Math.max(1, ...porPagamento.map((p) => num(p.total)));
  const maxCategoria = Math.max(1, ...porCategoria.map((c) => num(c.total)));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada das receitas, despesas e resultado da sua loja.</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(dados.mes)} onValueChange={(v) => v && carregar(Number(v), dados.ano)} disabled={carregando}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MESES_LABEL).map(([id, nome]) => (
                <SelectItem key={id} value={id}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(dados.ano)} onValueChange={(v) => v && carregar(dados.mes, Number(v))} disabled={carregando}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dados.anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile titulo="Receita" valor={formatBRL(resumo.total_income)} icon={TrendingUp} tone="positive" />
        <KpiTile titulo="Despesa" valor={formatBRL(resumo.total_expense)} icon={TrendingDown} tone="negative" />
        <KpiTile
          titulo="Lucro / Prejuízo"
          valor={formatBRL(resumo.profit_or_loss)}
          icon={Wallet}
          tone={resumo.profit_or_loss >= 0 ? "positive" : "negative"}
        />
        <KpiTile titulo="Margem" valor={`${resumo.margin_percent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`} icon={Percent} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <CardHeader className="p-0 pb-3">
            <div className="text-sm font-medium">Fluxo de caixa</div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 p-0 sm:flex-row sm:items-start">
            <div className="relative size-44 shrink-0 rounded-full" style={{ background: conicGradient }}>
              <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-popover text-center">
                <span className="text-[11px] text-muted-foreground">Saldo</span>
                <span className={`text-sm font-semibold ${saldo >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatBRL(saldo)}</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border p-2">
                  <div className="text-muted-foreground">Receitas</div>
                  <div className="font-semibold text-emerald-600">{formatBRL(totalIncome)}</div>
                </div>
                <div className="rounded-lg border p-2">
                  <div className="text-muted-foreground">Despesas</div>
                  <div className="font-semibold text-destructive">{formatBRL(totalExpense)}</div>
                </div>
              </div>
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {fatias.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Sem movimentações no período.</div>
                ) : (
                  fatias.map((f) => {
                    const pct = grandPie > 0 ? (f.valor / grandPie) * 100 : 0;
                    return (
                      <div key={f.label} className="flex items-center gap-2 text-xs">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: f.cor }} />
                        <span className="min-w-0 flex-1 truncate">{f.label}</span>
                        <span className="shrink-0 text-muted-foreground">{pct.toFixed(1)}%</span>
                        <span className="w-20 shrink-0 text-right font-medium">{formatBRL(f.valor)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <CardHeader className="p-0 pb-3">
              <div className="text-sm font-medium">Receitas por forma</div>
            </CardHeader>
            <CardContent className="space-y-2 p-0">
              {porPagamento.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem receitas no período.</div>
              ) : (
                porPagamento.map((p) => (
                  <div key={p.payment_method}>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span>{p.payment_method}</span>
                      <span className="font-medium">{formatBRL(p.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(10, (num(p.total) / maxPagamento) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="p-4">
            <CardHeader className="p-0 pb-3">
              <div className="text-sm font-medium">Despesas por categoria</div>
            </CardHeader>
            <CardContent className="space-y-2 p-0">
              {porCategoria.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem despesas no período.</div>
              ) : (
                porCategoria.map((c) => (
                  <div key={c.category_name}>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span>{c.category_name}</span>
                      <span className="font-medium">{formatBRL(c.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-destructive"
                        style={{ width: `${Math.max(10, (num(c.total) / maxCategoria) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <CardHeader className="p-0 pb-3">
            <div className="text-sm font-medium">Contas financeiras</div>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            {contas.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhuma conta cadastrada.</div>
            ) : (
              contas.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                  <span className="font-medium">{c.name}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-600">+{formatBRL(c.monthly_income)}</span>
                    <span className="text-destructive">-{formatBRL(c.monthly_expense)}</span>
                    <span className={`font-semibold ${num(c.monthly_balance) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {formatBRL(c.monthly_balance)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader className="p-0 pb-3">
            <div className="text-sm font-medium">DRE do mês</div>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
              <span>Receita bruta</span>
              <span className="font-medium">{formatBRL(dre.gross_revenue)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
              <span>Despesas totais</span>
              <span className="font-medium">{formatBRL(dre.total_expenses)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
              <span>Lucro líquido</span>
              <span className={`font-semibold ${dre.net_profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatBRL(dre.net_profit)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
              <span>Margem</span>
              <span className="font-medium">{dre.margin_percent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
