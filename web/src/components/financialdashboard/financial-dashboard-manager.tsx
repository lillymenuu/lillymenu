"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Wallet, Percent, PieChart, BarChart3, Landmark, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/components/ordermanager/constants";
import { MESES_LABEL, DONUT_CORES, DESPESA_COR } from "@/lib/financeiroDashboard";
import type { FinanceiroDashboardResposta } from "@/lib/financeiroDashboard";

function num(v: string | number): number {
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

function fmtPct(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KpiTile({
  titulo,
  valor,
  icon: Icon,
  tone,
  delay,
}: {
  titulo: string;
  valor: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "positive" | "negative" | "neutral";
  delay: number;
}) {
  const toneClasses =
    tone === "positive"
      ? { text: "text-emerald-600", badge: "bg-emerald-500/10 text-emerald-600" }
      : tone === "negative"
        ? { text: "text-destructive", badge: "bg-destructive/10 text-destructive" }
        : { text: "text-foreground", badge: "bg-primary/10 text-primary" };

  return (
    <Card
      className="group animate-in fade-in slide-in-from-bottom-2 fill-mode-both p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${delay}ms`, animationDuration: "500ms" }}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{titulo}</div>
        <div className={`flex size-7 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 ${toneClasses.badge}`}>
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className={`mt-1.5 text-xl font-semibold tabular-nums ${toneClasses.text}`}>{valor}</div>
    </Card>
  );
}

function SectionCard({
  titulo,
  icon: Icon,
  delay,
  children,
}: {
  titulo: string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <Card
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both p-4 transition-shadow duration-300 hover:shadow-md"
      style={{ animationDelay: `${delay}ms`, animationDuration: "500ms" }}
    >
      <CardHeader className="p-0 pb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-primary" />
          {titulo}
        </div>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function BarraAnimada({ label, valor, max, cor }: { label: string; valor: number; max: number; cor: "income" | "expense" }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, [valor]);

  const alvo = Math.max(4, (valor / max) * 100);

  return (
    <div className="group">
      <div className="mb-0.5 flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{formatBRL(valor)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-2 rounded-full transition-[width] duration-700 ease-out ${
            cor === "income" ? "bg-emerald-500 group-hover:bg-emerald-400" : "bg-destructive group-hover:bg-destructive/80"
          }`}
          style={{ width: `${montado ? alvo : 0}%` }}
        />
      </div>
    </div>
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

  type Fatia = { label: string; valor: number; cor: string };
  const fatias: Fatia[] = porPagamento.map((p, i) => ({
    label: p.payment_method,
    valor: num(p.total),
    cor: DONUT_CORES[i % DONUT_CORES.length],
  }));
  if (totalExpense > 0) {
    fatias.push({ label: "Despesas", valor: totalExpense, cor: DESPESA_COR });
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
      <div className="flex animate-in fade-in slide-in-from-bottom-2 flex-col gap-3 duration-500 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada das receitas, despesas e resultado da sua loja.</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(dados.mes)} onValueChange={(v) => v && carregar(Number(v), dados.ano)} disabled={carregando}>
            <SelectTrigger className="w-40">
              <SelectValue>{() => MESES_LABEL[dados.mes] ?? dados.mes}</SelectValue>
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
              <SelectValue>{() => dados.ano}</SelectValue>
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

      <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 transition-opacity duration-200 ${carregando ? "opacity-60" : ""}`}>
        <KpiTile titulo="Receita" valor={formatBRL(resumo.total_income)} icon={TrendingUp} tone="positive" delay={0} />
        <KpiTile titulo="Despesa" valor={formatBRL(resumo.total_expense)} icon={TrendingDown} tone="negative" delay={60} />
        <KpiTile
          titulo="Lucro / Prejuízo"
          valor={formatBRL(resumo.profit_or_loss)}
          icon={Wallet}
          tone={resumo.profit_or_loss >= 0 ? "positive" : "negative"}
          delay={120}
        />
        <KpiTile titulo="Margem" valor={`${fmtPct(resumo.margin_percent)}%`} icon={Percent} tone="neutral" delay={180} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard titulo="Fluxo de caixa" icon={PieChart} delay={220}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div
              className="relative size-44 shrink-0 animate-in zoom-in-75 rounded-full fade-in transition-transform duration-500 ease-out hover:scale-105"
              style={{ background: conicGradient, animationDuration: "700ms" }}
            >
              <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-popover text-center shadow-inner">
                <span className="text-[11px] text-muted-foreground">Saldo</span>
                <span className={`text-sm font-semibold tabular-nums ${saldo >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {formatBRL(saldo)}
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border p-2 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5">
                  <div className="text-muted-foreground">Receitas</div>
                  <div className="font-semibold tabular-nums text-emerald-600">{formatBRL(totalIncome)}</div>
                </div>
                <div className="rounded-lg border p-2 transition-colors hover:border-destructive/40 hover:bg-destructive/5">
                  <div className="text-muted-foreground">Despesas</div>
                  <div className="font-semibold tabular-nums text-destructive">{formatBRL(totalExpense)}</div>
                </div>
              </div>
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {fatias.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Sem movimentações no período.</div>
                ) : (
                  fatias.map((f, i) => {
                    const pct = grandPie > 0 ? (f.valor / grandPie) * 100 : 0;
                    return (
                      <div
                        key={f.label}
                        className="flex animate-in fade-in slide-in-from-left-1 fill-mode-both items-center gap-2 rounded-md px-1 py-0.5 text-xs transition-colors hover:bg-muted/60"
                        style={{ animationDelay: `${300 + i * 50}ms`, animationDuration: "400ms" }}
                      >
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: f.cor }} />
                        <span className="min-w-0 flex-1 truncate">{f.label}</span>
                        <span className="shrink-0 text-muted-foreground">{pct.toFixed(1)}%</span>
                        <span className="w-20 shrink-0 text-right font-medium tabular-nums">{formatBRL(f.valor)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard titulo="Receitas por forma" icon={BarChart3} delay={260}>
            <div className="space-y-3">
              {porPagamento.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem receitas no período.</div>
              ) : (
                porPagamento.map((p) => (
                  <BarraAnimada key={p.payment_method} label={p.payment_method} valor={num(p.total)} max={maxPagamento} cor="income" />
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard titulo="Despesas por categoria" icon={BarChart3} delay={300}>
            <div className="space-y-3">
              {porCategoria.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem despesas no período.</div>
              ) : (
                porCategoria.map((c) => (
                  <BarraAnimada key={c.category_name} label={c.category_name} valor={num(c.total)} max={maxCategoria} cor="expense" />
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard titulo="Contas financeiras" icon={Landmark} delay={340}>
          <div className="space-y-2">
            {contas.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhuma conta cadastrada.</div>
            ) : (
              contas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="font-medium">{c.name}</span>
                  <div className="flex gap-3 text-xs tabular-nums">
                    <span className="text-emerald-600">+{formatBRL(c.monthly_income)}</span>
                    <span className="text-destructive">-{formatBRL(c.monthly_expense)}</span>
                    <span className={`font-semibold ${num(c.monthly_balance) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {formatBRL(c.monthly_balance)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard titulo="DRE do mês" icon={ClipboardList} delay={380}>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/40">
              <span>Receita bruta</span>
              <span className="font-medium tabular-nums">{formatBRL(dre.gross_revenue)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/40">
              <span>Despesas totais</span>
              <span className="font-medium tabular-nums">{formatBRL(dre.total_expenses)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/40">
              <span>Lucro líquido</span>
              <span className={`font-semibold tabular-nums ${dre.net_profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {formatBRL(dre.net_profit)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/40">
              <span>Margem</span>
              <span className="font-medium tabular-nums">{fmtPct(dre.margin_percent)}%</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
