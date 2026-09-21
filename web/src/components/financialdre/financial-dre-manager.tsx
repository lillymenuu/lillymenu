"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinancialDreCharts } from "@/components/financialdre/financial-dre-charts";
import type { FinanceiroDreResposta } from "@/lib/financeiroDre";

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

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">DRE</h1>
          <p className="text-sm text-muted-foreground">Demonstrativo de resultado do exercício em gráficos, com a evolução mês a mês.</p>
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

      <FinancialDreCharts meses={meses} carregando={carregando} />
    </div>
  );
}
