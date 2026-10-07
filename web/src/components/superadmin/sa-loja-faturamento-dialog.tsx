"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { formatBRLMilhar } from "@/components/ordermanager/constants";
import { saCall, type SaLoja } from "@/lib/superadmin";

/* Faturamento real da loja (cobrancas pagas, somadas por mes/ano — ver superadminFaturamento.ts),
   em tom preto e branco como pedido (barras em cinza-grafite, sem cor de marca). Carregado sob
   demanda quando o modal abre. */

type Faturamento = { mensal: { label: string; valor: number }[]; anual: { label: string; valor: number }[] };

const CINZA = "#27272a";
const chartConfig: ChartConfig = { valor: { label: "Faturamento", color: CINZA } };

export function SaLojaFaturamentoDialog({ loja, onOpenChange }: { loja: SaLoja | null; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={loja !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto sm:max-w-4xl">
        {loja && <Conteudo key={loja.id} loja={loja} />}
      </DialogContent>
    </Dialog>
  );
}

function Conteudo({ loja }: { loja: SaLoja }) {
  const [dados, setDados] = useState<Faturamento | null>(null);

  useEffect(() => {
    let ativo = true;
    void saCall<{ ok: boolean; faturamento?: Faturamento }>("superadmin_loja_faturamento", undefined, { loja_id: String(loja.id) }).then((r) => {
      if (ativo && r.ok) setDados(r.faturamento ?? { mensal: [], anual: [] });
    });
    return () => {
      ativo = false;
    };
  }, [loja.id]);

  const totalMensal = dados?.mensal.reduce((s, m) => s + m.valor, 0) ?? 0;
  const totalAnual = dados?.anual.reduce((s, a) => s + a.valor, 0) ?? 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Faturamento — {loja.nome}</DialogTitle>
      </DialogHeader>

      {!dados ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Faturamento mensal</h3>
            <p className="text-xs text-slate-500">Últimos 12 meses · total {formatBRLMilhar(totalMensal)}</p>
            <ChartContainer config={chartConfig} className="mt-3 aspect-auto h-56 w-full">
              <BarChart data={dados.mensal} margin={{ top: 8, left: -24, right: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} stroke="#64748b" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} stroke="#64748b" />
                <Tooltip cursor={{ fill: "rgba(39,39,42,.06)" }} formatter={(v) => [formatBRLMilhar(Number(v)), "Faturamento"]} />
                <Bar dataKey="valor" fill={CINZA} radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={700} />
              </BarChart>
            </ChartContainer>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Faturamento anual</h3>
            <p className="text-xs text-slate-500">Por ano · total {formatBRLMilhar(totalAnual)}</p>
            <ChartContainer config={chartConfig} className="mt-3 aspect-auto h-56 w-full">
              <BarChart data={dados.anual} margin={{ top: 8, left: -24, right: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="#64748b" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} stroke="#64748b" />
                <Tooltip cursor={{ fill: "rgba(39,39,42,.06)" }} formatter={(v) => [formatBRLMilhar(Number(v)), "Faturamento"]} />
                <Bar dataKey="valor" fill={CINZA} radius={[4, 4, 0, 0]} maxBarSize={44} animationDuration={700} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      )}
    </>
  );
}
