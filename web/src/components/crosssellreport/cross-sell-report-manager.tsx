"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Banknote, Receipt, ShoppingBag, Percent } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/order-list/date-range-picker";
import { formatBRL, formatDataHora } from "@/components/ordermanager/constants";
import { TopRankingChart } from "@/components/sales/top-ranking-chart";
import { CrossSellChart } from "@/components/crosssellreport/cross-sell-chart";
import type { CrossSellReportParams, CrossSellReportResposta } from "@/lib/crossSellReport";
import { cn } from "cn";

const PERIODO_ITEMS: Record<string, string> = {
  hoje: "Hoje",
  "7dias": "Últimos 7 dias",
  "30dias": "Últimos 30 dias",
  customizado: "Customizado",
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CrossSellReportManager({ dadosIniciais }: { dadosIniciais: CrossSellReportResposta }) {
  const [periodo, setPeriodo] = useState("hoje");
  const [dataIni, setDataIni] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());

  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);

  const primeiraRenderRef = useRef(true);

  async function carregar() {
    setCarregando(true);
    try {
      const params: CrossSellReportParams = { periodo };
      if (periodo === "customizado") {
        params.data_ini = dataIni;
        params.data_fim = dataFim;
      }
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) qs.set(k, String(v));
      });
      const res = await fetch(`/api/crosssellreport/listar?${qs.toString()}`, { cache: "no-store" });
      const data: CrossSellReportResposta & { ok: boolean; msg?: string } = await res.json();
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
  }, [periodo, dataIni, dataFim]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Relatório de Cross-sell</h1>
          <p className="text-sm text-muted-foreground">Acompanhe o quanto o cross-sell está rendendo pra sua loja.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          {periodo === "customizado" && (
            <DateRangePicker
              dataIni={dataIni}
              dataFim={dataFim}
              onChange={(ini, fim) => {
                setDataIni(ini);
                setDataFim(fim);
              }}
            />
          )}
        </div>
      </div>

      <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4 transition-opacity", carregando && "opacity-60")}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Faturamento cross-sell</span>
            <Banknote className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatBRL(dados.resumo.faturamento)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Pedidos com cross-sell</span>
            <ShoppingBag className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{dados.resumo.pedidos_cross_sell}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Itens via cross-sell</span>
            <Percent className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{dados.resumo.itens_vendidos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Média com cross-sell</span>
            <Receipt className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatBRL(dados.resumo.ticket_medio)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <CrossSellChart dados={dados.por_dia} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <TopRankingChart
              titulo="Produtos mais vendidos"
              subtitulo="Ranking via cross-sell no período"
              dados={dados.top_produtos.map((p) => ({ nome: p.nome, valor: p.valor }))}
              valorLabel="Faturamento"
              formatarValor={formatBRL}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Itens vendidos via cross-sell</h3>
            <p className="text-xs text-muted-foreground">Últimos itens do período</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-normal text-muted-foreground">Pedido</TableHead>
                <TableHead className="font-normal text-muted-foreground">Cliente</TableHead>
                <TableHead className="font-normal text-muted-foreground">Produto sugerido</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Qtd</TableHead>
                <TableHead className="font-normal text-muted-foreground">Data</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.itens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum item de cross-sell vendido no período
                  </TableCell>
                </TableRow>
              )}
              {dados.itens.map((item, i) => (
                <TableRow key={`${item.codigo}-${i}`}>
                  <TableCell className="font-normal">#{item.codigo}</TableCell>
                  <TableCell className="font-normal">{item.cliente}</TableCell>
                  <TableCell className="font-normal">{item.produto_nome}</TableCell>
                  <TableCell className="text-right font-normal tabular-nums text-muted-foreground">{item.quantidade}</TableCell>
                  <TableCell className="font-normal text-muted-foreground">{formatDataHora(item.criado_em)}</TableCell>
                  <TableCell className="text-right font-normal tabular-nums">{formatBRL(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
