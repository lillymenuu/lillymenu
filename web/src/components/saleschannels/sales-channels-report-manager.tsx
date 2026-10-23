"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Filter, Banknote, Receipt, Tag } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/order-list/date-range-picker";
import { formatBRL } from "@/components/ordermanager/constants";
import type { RelatorioCanaisVendaResultado } from "@/db/queries/relatorioCanaisVenda";
import { cn } from "cn";

const PERIODO_ITEMS: Record<string, string> = {
  hoje: "Hoje",
  "7dias": "Últimos 7 dias",
  "30dias": "Últimos 30 dias",
  customizado: "Customizado",
};

const CANAL_ITEMS: Record<string, string> = {
  "": "Todos",
  balcao: "PDV (painel)",
  loja: "Cardápio digital (link)",
};

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatCurto(dataHora: string): string {
  const [data, hora] = dataHora.split(" ");
  const [, mesStr, diaStr] = data.split("-");
  const mes = Number(mesStr);
  return `${Number(diaStr)} ${MESES_ABREV[mes - 1]} ${hora ? hora.slice(0, 5) : "00:00"}`;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SalesChannelsReportManager({ dadosIniciais }: { dadosIniciais: RelatorioCanaisVendaResultado }) {
  const [canal, setCanal] = useState("");
  const [periodo, setPeriodo] = useState("hoje");
  const [dataIni, setDataIni] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());

  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);

  const primeiraRenderRef = useRef(true);

  async function carregar() {
    setCarregando(true);
    try {
      const qs = new URLSearchParams({ periodo });
      if (canal) qs.set("canal", canal);
      if (periodo === "customizado") {
        qs.set("data_ini", dataIni);
        qs.set("data_fim", dataFim);
      }
      const res = await fetch(`/api/saleschannels/relatorio?${qs.toString()}`, { cache: "no-store" });
      const data: RelatorioCanaisVendaResultado & { ok: boolean; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar o relatório.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar o relatório.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (primeiraRenderRef.current) {
      primeiraRenderRef.current = false;
      return;
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal, periodo, dataIni, dataFim]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Relatório de canais de venda</h1>
        <p className="text-sm text-muted-foreground">Compare as vendas entre o PDV e o cardápio digital da loja.</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Filter size={16} />
            </div>
            <div className="text-sm font-medium">Filtros</div>
          </div>
          <div className="flex flex-wrap items-end justify-end gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.66rem] font-medium tracking-wide text-muted-foreground uppercase">Canal de venda</span>
              <Select items={CANAL_ITEMS} value={canal} onValueChange={(v) => setCanal(v ?? "")}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CANAL_ITEMS).map(([value, label]) => (
                    <SelectItem key={value || "todos"} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.66rem] font-medium tracking-wide text-muted-foreground uppercase">Período</span>
              <div className="flex items-center gap-2">
                <Select items={PERIODO_ITEMS} value={periodo} onValueChange={(v) => setPeriodo(v ?? "hoje")}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIODO_ITEMS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {periodo === "customizado" ? (
                  <DateRangePicker
                    dataIni={dataIni}
                    dataFim={dataFim}
                    onChange={(ini, fim) => {
                      setDataIni(ini);
                      setDataFim(fim);
                    }}
                  />
                ) : (
                  <span className="flex h-8 items-center rounded-lg border border-input px-2.5 text-xs whitespace-nowrap text-muted-foreground">
                    {formatCurto(dados.periodo.inicio)} — {formatCurto(dados.periodo.fim)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3 transition-opacity", carregando && "opacity-60")}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Total vendido</span>
            <Banknote className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatBRL(dados.resumo.totalVendido)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Quantidade de pedidos</span>
            <Receipt className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{dados.resumo.quantidadePedidos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Ticket médio</span>
            <Tag className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatBRL(dados.resumo.ticketMedio)}</CardContent>
        </Card>
      </div>

      <Card className="gap-0 rounded-2xl py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-normal text-muted-foreground">Canal de venda</TableHead>
                <TableHead className="font-normal text-muted-foreground">Pedidos</TableHead>
                <TableHead className="font-normal text-muted-foreground">Total vendido</TableHead>
                <TableHead className="font-normal text-muted-foreground">Ticket médio</TableHead>
                <TableHead className="font-normal text-muted-foreground">% do total vendido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.canais.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhuma venda encontrada no período.
                  </TableCell>
                </TableRow>
              )}
              {dados.canais.map((canalLinha) => (
                <TableRow key={canalLinha.origem}>
                  <TableCell className="font-medium text-primary">{canalLinha.label}</TableCell>
                  <TableCell className="font-normal">{canalLinha.pedidos}</TableCell>
                  <TableCell className="font-normal">{formatBRL(canalLinha.total)}</TableCell>
                  <TableCell className="font-normal">{formatBRL(canalLinha.ticketMedio)}</TableCell>
                  <TableCell className="font-medium text-primary">{Math.round(canalLinha.percentualTotal)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Considera os pedidos finalizados que registram o canal de venda. Pedidos de marketplaces (iFood, Keeta, 99Food) não entram neste relatório.
      </p>
    </div>
  );
}
