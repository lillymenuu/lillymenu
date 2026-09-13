"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/components/ordermanager/constants";
import { MESES_ABREV } from "@/lib/financeiroDre";
import type { FinanceiroDreResposta } from "@/lib/financeiroDre";

function corValor(v: number) {
  if (v > 0) return "text-emerald-600";
  if (v < 0) return "text-destructive";
  return "text-muted-foreground";
}

export function FinancialDreManager({ dadosIniciais }: { dadosIniciais: FinanceiroDreResposta }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);

  async function carregar(ano: string) {
    setCarregando(true);
    try {
      const res = await fetch(`/api/financialdre?ano=${ano}`);
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar o DRE.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar o DRE.");
    } finally {
      setCarregando(false);
    }
  }

  const meses = Array.from({ length: 12 }, (_, i) => dados.meses[String(i + 1)]);
  const totalReceita = meses.reduce((s, m) => s + m.total_income, 0);
  const totalDespesa = meses.reduce((s, m) => s + m.total_expense, 0);
  const totalLucro = meses.reduce((s, m) => s + m.profit_or_loss, 0);
  const margemAnual = totalReceita > 0 ? ((totalReceita - totalDespesa) / totalReceita) * 100 : 0;
  const suffix = String(dados.ano).slice(-2);

  const linhas = [
    { label: "Receita bruta", icon: TrendingUp, iconCls: "bg-emerald-100 text-emerald-600", valores: meses.map((m) => m.total_income), total: totalReceita, formato: "moeda" as const },
    { label: "Despesas", icon: TrendingDown, iconCls: "bg-amber-100 text-amber-700", valores: meses.map((m) => m.total_expense), total: totalDespesa, formato: "moeda" as const },
    { label: "Lucro líquido", icon: DollarSign, iconCls: "bg-indigo-100 text-indigo-600", valores: meses.map((m) => m.profit_or_loss), total: totalLucro, formato: "moeda" as const },
    { label: "Margem", icon: Percent, iconCls: "bg-amber-100 text-amber-600", valores: meses.map((m) => m.margin_percent), total: margemAnual, formato: "percentual" as const },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">DRE</h1>
          <p className="text-sm text-muted-foreground">Demonstrativo de resultado do exercício organizado por mês.</p>
        </div>
        <div className="w-32">
          <Select value={String(dados.ano)} onValueChange={(v) => v && carregar(v as string)} disabled={carregando}>
            <SelectTrigger className="w-full">
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

      <Card className={`overflow-hidden p-4 transition-opacity duration-200 ${carregando ? "opacity-60" : ""}`}>
        <h2 className="mb-1 text-sm font-semibold">Tabela DRE</h2>
        <p className="mb-4 text-xs text-muted-foreground">Receita bruta, despesas, lucro líquido e margem por competência.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="whitespace-nowrap py-2 pr-3 text-left font-medium text-muted-foreground">Indicador</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="whitespace-nowrap px-2 py-2 text-right font-medium text-muted-foreground">
                    {MESES_ABREV[i + 1]}/{suffix}
                  </th>
                ))}
                <th className="whitespace-nowrap py-2 pl-3 text-right font-semibold">Total anual</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.label} className="border-b last:border-b-0">
                  <td className="whitespace-nowrap py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={`flex size-6 items-center justify-center rounded-full ${linha.iconCls}`}>
                        <linha.icon className="size-3.5" />
                      </span>
                      <span className="font-medium">{linha.label}</span>
                    </div>
                  </td>
                  {linha.valores.map((v, i) => (
                    <td key={i} className={`whitespace-nowrap px-2 py-2.5 text-right tabular-nums ${corValor(v)}`}>
                      {linha.formato === "moeda" ? formatBRL(v) : `${v.toFixed(1).replace(".", ",")}%`}
                    </td>
                  ))}
                  <td className={`whitespace-nowrap py-2.5 pl-3 text-right font-semibold tabular-nums ${corValor(linha.total)}`}>
                    {linha.formato === "moeda" ? formatBRL(linha.total) : `${linha.total.toFixed(1).replace(".", ",")}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
