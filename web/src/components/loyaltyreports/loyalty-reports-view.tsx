"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Wallet, ArrowDownCircle, Receipt, Ticket, ArrowUp, ArrowDown } from "lucide-react";
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
import { formatDataCurta } from "@/components/cliente/types";
import { formatBRL } from "@/components/ordermanager/constants";
import type { RelatoriosFidelidadeParams, RelatoriosFidelidadeResposta } from "@/lib/relatoriosFidelidade";
import { cn } from "cn";

const PERIODO_ITEMS: Record<string, string> = {
  hoje: "Hoje",
  "7": "7 dias",
  "15": "15 dias",
  "30": "30 dias",
  "60": "60 dias",
  "90": "90 dias",
  "365": "1 ano",
  custom: "Personalizado",
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LoyaltyReportsView({ dadosIniciais }: { dadosIniciais: RelatoriosFidelidadeResposta }) {
  const [periodo, setPeriodo] = useState("30");
  const [dataIni, setDataIni] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);

  const primeiraRenderRef = useRef(true);

  async function carregar() {
    setCarregando(true);
    try {
      const params: RelatoriosFidelidadeParams = {};
      if (periodo === "custom") {
        params.data_ini = dataIni;
        params.data_fim = dataFim;
      } else {
        params.periodo = periodo;
      }
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) qs.set(k, v);
      });
      const res = await fetch(`/api/loyaltyreports/listar?${qs.toString()}`, { cache: "no-store" });
      const data: RelatoriosFidelidadeResposta & { ok: boolean; msg?: string } = await res.json();
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

  const periodoTexto = `${formatDataCurta(dados.data_ini)} — ${formatDataCurta(dados.data_fim)}`;

  return (
    <div className={cn("flex h-full flex-col gap-6 p-4 md:p-6 transition-opacity", carregando && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Visão geral de Fidelidade</h1>
          <p className="text-sm text-muted-foreground">Mostrando resultados de {periodoTexto}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select items={PERIODO_ITEMS} value={periodo} onValueChange={(v) => setPeriodo(v ?? "30")}>
            <SelectTrigger className="w-36">
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
          {periodo === "custom" && (
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

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Cashback</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs text-muted-foreground">Saldo de cashback da base</span>
              <Wallet className="text-primary" size={16} />
            </CardHeader>
            <CardContent className="text-xl font-bold">{formatBRL(dados.cashback_saldo_base)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs text-muted-foreground">Cashback utilizado</span>
              <ArrowDownCircle className="text-destructive" size={16} />
            </CardHeader>
            <CardContent className="text-xl font-bold">{formatBRL(dados.cashback_utilizado)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs text-muted-foreground">Pedidos com cashback</span>
              <Receipt className="text-primary" size={16} />
            </CardHeader>
            <CardContent className="text-xl font-bold">{dados.pedidos_com_cashback}</CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          Clientes com maior saldo acumulado{" "}
          <span className="font-normal text-muted-foreground">no período selecionado</span>
        </h2>
        <Card className="gap-0 rounded-2xl py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-normal text-muted-foreground">Nome do cliente</TableHead>
                  <TableHead className="font-normal text-muted-foreground">Cliente desde</TableHead>
                  <TableHead className="text-right font-normal text-muted-foreground">Saldo disponível</TableHead>
                  <TableHead className="text-right font-normal text-muted-foreground">Saldo utilizado</TableHead>
                  <TableHead className="text-right font-normal text-muted-foreground">Expira em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.clientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum cliente com cashback encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  dados.clientes.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-normal">{c.nome}</TableCell>
                      <TableCell className="font-normal text-muted-foreground">
                        {c.criado_em ? formatDataCurta(c.criado_em) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-normal tabular-nums">{formatBRL(c.saldo)}</TableCell>
                      <TableCell className="text-right font-normal tabular-nums text-muted-foreground">
                        {formatBRL(c.usado)}
                      </TableCell>
                      <TableCell className="text-right font-normal tabular-nums text-muted-foreground">
                        {c.expira_em ? formatDataCurta(c.expira_em) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          Histórico de entradas e saídas de cashback{" "}
          <span className="font-normal text-muted-foreground">no período selecionado</span>
        </h2>
        <Card className="gap-0 rounded-2xl py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-normal text-muted-foreground">Tipo</TableHead>
                  <TableHead className="font-normal text-muted-foreground">Data</TableHead>
                  <TableHead className="text-right font-normal text-muted-foreground">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.historico.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      Nenhum movimento de cashback encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  dados.historico.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <span
                          className={cn(
                            "flex w-fit items-center gap-1.5 font-medium",
                            item.classe === "positivo" ? "text-emerald-600" : "text-destructive"
                          )}
                        >
                          {item.classe === "positivo" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                          {item.tipo}
                        </span>
                      </TableCell>
                      <TableCell className="font-normal text-muted-foreground">
                        {item.data ? formatDataCurta(item.data) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-normal tabular-nums">
                        {item.valor < 0 ? "-" : ""}
                        {formatBRL(Math.abs(item.valor))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Cupom de desconto</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs text-muted-foreground">Descontos provenientes de cupons</span>
              <Ticket className="text-primary" size={16} />
            </CardHeader>
            <CardContent className="text-xl font-bold">{formatBRL(dados.cupom_desconto)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs text-muted-foreground">Pedidos com cupons</span>
              <Receipt className="text-primary" size={16} />
            </CardHeader>
            <CardContent className="text-xl font-bold">{dados.cupom_pedidos}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
