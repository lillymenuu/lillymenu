"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Banknote, Users, Percent, Clock3, PhoneCall, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/order-list/date-range-picker";
import { formatBRL } from "@/components/ordermanager/constants";
import { TopRankingChart } from "@/components/sales/top-ranking-chart";
import { cn } from "cn";
import type { Turno } from "@/db/queries/relatorioGarcom";
import type { WaiterReportResposta } from "@/lib/waiterReport";

const PERIODO_ITEMS: Record<string, string> = {
  hoje: "Hoje",
  "7dias": "Últimos 7 dias",
  "30dias": "Últimos 30 dias",
  customizado: "Customizado",
};

const TURNO_ITEMS: Record<Turno, string> = {
  todos: "Todos os turnos",
  manha: "Manhã (06h–12h)",
  tarde: "Tarde (12h–18h)",
  noite: "Noite (18h–06h)",
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMinutos(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h${m > 0 ? ` ${m}min` : ""}`;
}

export function WaiterReportManager({
  dadosIniciais,
  garcons,
}: {
  dadosIniciais: WaiterReportResposta;
  garcons: { id: number; nome: string; ativo: boolean }[];
}) {
  const [periodo, setPeriodo] = useState("hoje");
  const [dataIni, setDataIni] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());
  const [turno, setTurno] = useState<Turno>("todos");
  const [garcomId, setGarcomId] = useState<string>("todos");

  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);

  const primeiraRenderRef = useRef(true);

  async function carregar() {
    setCarregando(true);
    try {
      const qs = new URLSearchParams();
      qs.set("periodo", periodo);
      if (periodo === "customizado") {
        qs.set("data_ini", dataIni);
        qs.set("data_fim", dataFim);
      }
      qs.set("turno", turno);
      if (garcomId !== "todos") qs.set("garcom_id", garcomId);

      const res = await fetch(`/api/waiter-report/listar?${qs.toString()}`, { cache: "no-store" });
      const data: WaiterReportResposta & { ok: boolean; msg?: string } = await res.json();
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
  }, [periodo, dataIni, dataFim, turno, garcomId]);

  const linhaUnica = garcomId !== "todos" ? dados.por_garcom.find((l) => String(l.garcom_id) === garcomId) : null;

  const totais = dados.por_garcom.reduce(
    (acc, l) => ({
      valorVendido: acc.valorVendido + l.valor_vendido,
      mesasAtendidas: acc.mesasAtendidas + l.mesas_atendidas,
      comissaoValor: acc.comissaoValor + l.comissao_valor,
    }),
    { valorVendido: 0, mesasAtendidas: 0, comissaoValor: 0 }
  );

  const garconsItems: Record<string, string> = { todos: "Todos os garçons", ...Object.fromEntries(garcons.map((g) => [String(g.id), g.nome])) };

  return (
    <TooltipProvider delay={150}>
      <div className="flex h-full flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Relatório de Garçons</h1>
            <p className="text-sm text-muted-foreground">Desempenho, comissão e giro de mesa por garçom.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select items={garconsItems} value={garcomId} onValueChange={(v) => setGarcomId(v ?? "todos")}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(garconsItems).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select items={TURNO_ITEMS} value={turno} onValueChange={(v) => setTurno((v as Turno) ?? "todos")}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TURNO_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <span className="text-xs text-muted-foreground">Valor vendido</span>
              <Banknote className="text-primary" size={16} />
            </CardHeader>
            <CardContent className="text-xl font-bold">{formatBRL(linhaUnica ? linhaUnica.valor_vendido : totais.valorVendido)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs text-muted-foreground">Mesas atendidas</span>
              <Users className="text-primary" size={16} />
            </CardHeader>
            <CardContent className="text-xl font-bold">{linhaUnica ? linhaUnica.mesas_atendidas : totais.mesasAtendidas}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs text-muted-foreground">Ticket médio por mesa</span>
              <Banknote className="text-primary" size={16} />
            </CardHeader>
            <CardContent className="text-xl font-bold">
              {formatBRL(linhaUnica ? linhaUnica.ticket_medio : totais.mesasAtendidas > 0 ? totais.valorVendido / totais.mesasAtendidas : 0)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                Comissão ({dados.taxa_servico_pct}%)
                <Tooltip>
                  <TooltipTrigger render={<Info size={12} className="cursor-help" />} />
                  <TooltipContent>Soma da taxa de serviço cobrada nos pedidos do garçom — pressupõe que 100% dela é repassada à equipe.</TooltipContent>
                </Tooltip>
              </span>
              <Percent className="text-primary" size={16} />
            </CardHeader>
            <CardContent className="text-xl font-bold">{formatBRL(linhaUnica ? linhaUnica.comissao_valor : totais.comissaoValor)}</CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <div className="mb-3">
              <h3 className="text-sm font-semibold">Desempenho por garçom</h3>
              <p className="text-xs text-muted-foreground">
                Período de {dados.periodo.inicio} a {dados.periodo.fim} · {TURNO_ITEMS[dados.turno]}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-normal text-muted-foreground">Garçom</TableHead>
                  <TableHead className="text-right font-normal text-muted-foreground">Mesas</TableHead>
                  <TableHead className="text-right font-normal text-muted-foreground">Pedidos</TableHead>
                  <TableHead className="text-right font-normal text-muted-foreground">Valor vendido</TableHead>
                  <TableHead className="text-right font-normal text-muted-foreground">Ticket médio</TableHead>
                  <TableHead className="text-right font-normal text-muted-foreground">Giro médio</TableHead>
                  <TableHead className="text-right font-normal text-muted-foreground">Base comissão</TableHead>
                  <TableHead className="text-right font-normal text-muted-foreground">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.por_garcom.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nenhum garçom cadastrado ainda.
                    </TableCell>
                  </TableRow>
                )}
                {dados.por_garcom.map((l) => (
                  <TableRow key={l.garcom_id}>
                    <TableCell className="font-normal">
                      {l.nome}
                      {!l.ativo && (
                        <Badge variant="outline" className="ml-2">
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-normal tabular-nums">{l.mesas_atendidas}</TableCell>
                    <TableCell className="text-right font-normal tabular-nums text-muted-foreground">{l.pedidos}</TableCell>
                    <TableCell className="text-right font-normal tabular-nums">{formatBRL(l.valor_vendido)}</TableCell>
                    <TableCell className="text-right font-normal tabular-nums">{formatBRL(l.ticket_medio)}</TableCell>
                    <TableCell className="text-right font-normal tabular-nums text-muted-foreground">{formatMinutos(l.giro_medio_minutos)}</TableCell>
                    <TableCell className="text-right font-normal tabular-nums text-muted-foreground">{formatBRL(l.base_comissao)}</TableCell>
                    <TableCell className="text-right font-normal tabular-nums">{formatBRL(l.comissao_valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {garcomId !== "todos" && (
          <Card>
            <CardContent>
              <TopRankingChart
                titulo="Produtos mais vendidos pelo garçom"
                subtitulo="Ranking por faturamento no período"
                dados={dados.top_produtos.map((p) => ({ nome: p.nome, valor: p.valor }))}
                valorLabel="Faturamento"
                formatarValor={formatBRL}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent>
              <div className="mb-3 flex items-center gap-2">
                <PhoneCall size={16} className="text-primary" />
                <h3 className="text-sm font-semibold">Chamados de mesa em aberto</h3>
                <Tooltip>
                  <TooltipTrigger render={<Info size={12} className="cursor-help text-muted-foreground" />} />
                  <TooltipContent>
                    Mesas que pediram a conta e ainda não foram dispensadas no Modo Garçom. Enquanto o pedido da mesa segue em andamento o tempo conta ao vivo; assim que o pedido fecha (finalizado ou cancelado), o tempo de espera fica congelado.
                  </TooltipContent>
                </Tooltip>
              </div>
              {dados.chamados_abertos.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma mesa chamando agora.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {dados.chamados_abertos.map((c) => (
                    <li key={c.mesa_id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>
                        {c.mesa_nome}
                        {c.garcom_nome && <span className="text-muted-foreground"> · {c.garcom_nome}</span>}
                      </span>
                      {c.status === "fechado" ? (
                        <span className="flex items-center gap-1.5">
                          <Badge variant="outline">Fechado</Badge>
                          <span className="text-xs text-muted-foreground">esperou {c.minutos} min</span>
                        </span>
                      ) : (
                        <Badge variant={c.minutos >= 10 ? "destructive" : "secondary"}>{c.minutos} min esperando</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-primary" />
                <h3 className="text-sm font-semibold">Mesas sem movimento no período</h3>
                <Tooltip>
                  <TooltipTrigger render={<Info size={12} className="cursor-help text-muted-foreground" />} />
                  <TooltipContent>Mesas ativas que não tiveram nenhum pedido lançado no período e turno selecionados.</TooltipContent>
                </Tooltip>
              </div>
              {dados.mesas_sem_movimento.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Todas as mesas ativas tiveram movimento no período.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dados.mesas_sem_movimento.map((m) => (
                    <Badge key={m.id} variant="outline">
                      {m.nome}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 size={12} />
          Giro médio considera apenas pedidos já finalizados no período (criação até a última atualização).
        </div>
      </div>
    </TooltipProvider>
  );
}
