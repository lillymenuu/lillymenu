"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Banknote, Receipt, ShoppingBag, Truck, XCircle, Wallet } from "lucide-react";
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
import { OrderDetailDialog } from "@/components/ordermanager/order-detail-dialog";
import { DateRangePicker } from "@/components/order-list/date-range-picker";
import { STATUS_CORES, TIPO_CORES, TIPO_LABELS, formatBRL } from "@/components/ordermanager/constants";
import { TopRankingChart } from "./top-ranking-chart";
import type { Motoboy } from "@/lib/pedidos";
import type { RelatoriosParams, RelatoriosResposta } from "@/lib/relatorios";
import { cn } from "cn";

const PERIODO_ITEMS: Record<string, string> = {
  hoje: "Hoje",
  "7dias": "Últimos 7 dias",
  "30dias": "Últimos 30 dias",
  customizado: "Customizado",
};

const TIPO_ITEMS: Record<string, string> = {
  "": "Todos",
  entrega: "Entrega",
  retirada: "Retirada",
};

const STATUS_LABELS_TABELA: Record<string, string> = {
  pendente: "Pendente",
  aceito: "Aceito",
  preparando: "Em preparo",
  entrega: "Em entrega",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const PAGAMENTO_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  sem_pagamento: "Sem pagamento",
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SalesManager({
  dadosIniciais,
  motoboys,
  phpAdminUrl,
}: {
  dadosIniciais: RelatoriosResposta;
  motoboys: Motoboy[];
  phpAdminUrl: string;
}) {
  const [periodo, setPeriodo] = useState("hoje");
  const [dataIni, setDataIni] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());
  const [tipo, setTipo] = useState("");
  const [pagina, setPagina] = useState(1);

  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [detalheId, setDetalheId] = useState<number | null>(null);

  const primeiraRenderRef = useRef(true);

  async function carregar() {
    setCarregando(true);
    try {
      const params: RelatoriosParams = { periodo, tipo: tipo || undefined, pagina, limite: 10 };
      if (periodo === "customizado") {
        params.data_ini = dataIni;
        params.data_fim = dataFim;
      }
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) qs.set(k, String(v));
      });
      const res = await fetch(`/api/sales/listar?${qs.toString()}`, { cache: "no-store" });
      const data: RelatoriosResposta & { ok: boolean; msg?: string } = await res.json();
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
  }, [periodo, dataIni, dataFim, tipo, pagina]);

  function mudarFiltro(fn: () => void) {
    fn();
    setPagina(1);
  }

  const pagamentoPorForma = Object.fromEntries(dados.vendas_pagamento.map((v) => [v.forma, v]));

  const inicioItem = dados.total === 0 ? 0 : (dados.pagina - 1) * dados.limite + 1;
  const fimItem = Math.min(dados.pagina * dados.limite, dados.total);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Vendas</h1>
          <p className="text-sm text-muted-foreground">Relatório de vendas da sua loja.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select items={TIPO_ITEMS} value={tipo} onValueChange={(v) => mudarFiltro(() => setTipo(v ?? ""))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIPO_ITEMS).map(([value, label]) => (
                <SelectItem key={value || "todos"} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select items={PERIODO_ITEMS} value={periodo} onValueChange={(v) => mudarFiltro(() => setPeriodo(v ?? "hoje"))}>
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
              onChange={(ini, fim) =>
                mudarFiltro(() => {
                  setDataIni(ini);
                  setDataFim(fim);
                })
              }
            />
          )}
        </div>
      </div>

      <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4 transition-opacity", carregando && "opacity-60")}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Faturamento</span>
            <Banknote className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatBRL(dados.resumo.faturamento)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Ticket médio</span>
            <Receipt className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatBRL(dados.resumo.ticket_medio)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Pedidos</span>
            <ShoppingBag className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{dados.resumo.total_pedidos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Taxas de entrega</span>
            <Truck className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatBRL(dados.resumo.taxa_entrega)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Pedidos cancelados</span>
            <XCircle className="text-destructive" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{dados.cancelados}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Valor cancelado</span>
            <XCircle className="text-destructive" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatBRL(dados.cancelados_valor)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Fiado recebido</span>
            <Wallet className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatBRL(dados.fiado_recebido)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(["pix", "credito", "debito", "dinheiro"] as const).map((forma) => (
          <Card key={forma} size="sm">
            <CardContent className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{PAGAMENTO_LABELS[forma]}</span>
              <span className="text-base font-semibold">{formatBRL(pagamentoPorForma[forma]?.total ?? 0)}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <TopRankingChart
              titulo="Produtos mais vendidos"
              subtitulo="Top 10 por quantidade no período"
              dados={dados.produtos.map((p) => ({ nome: p.nome, valor: p.quantidade }))}
              valorLabel="Unidades vendidas"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <TopRankingChart
              titulo="Melhores clientes"
              subtitulo="Top 10 por número de pedidos no período"
              dados={dados.clientes_frequencia.map((c) => ({ nome: c.nome, valor: c.pedidos }))}
              valorLabel="Pedidos"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold">Vendas por produto</h3>
          {dados.vendas_produtos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Sem dados no período.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              {dados.vendas_produtos.map((p, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="truncate text-sm font-medium">{p.nome}</div>
                  <div className="text-lg font-bold">{formatBRL(p.total)}</div>
                  <div className="text-xs text-muted-foreground">{p.quantidade} unidades</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-2xl py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N. pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                Array.from({ length: dados.limite }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-5 w-full animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : dados.pedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum pedido no período.
                  </TableCell>
                </TableRow>
              ) : (
                dados.pedidos.map((p) => {
                  const statusCor = STATUS_CORES[p.status] ?? STATUS_CORES.pendente;
                  return (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetalheId(p.id)}>
                      <TableCell className="font-medium">#{p.codigo}</TableCell>
                      <TableCell className="max-w-48 truncate">{p.cliente}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(p.criado_em.replace(" ", "T")).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {p.forma_pagamento ?? "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className="w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ background: statusCor.bg, color: statusCor.fg }}
                        >
                          {STATUS_LABELS_TABELA[p.status] ?? p.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-xs font-semibold tracking-wide"
                          style={{ color: TIPO_CORES[p.tipo] ?? "#6b7280" }}
                        >
                          {TIPO_LABELS[p.tipo] ?? p.tipo?.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatBRL(p.total)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {dados.paginas > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3">
            <span className="text-xs text-muted-foreground">
              Mostrando {inicioItem} a {fimItem} de {dados.total} pedidos
            </span>
            <div className="flex items-center gap-1">
              <PageButton disabled={pagina <= 1} onClick={() => setPagina(1)}>
                «
              </PageButton>
              <PageButton disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                ‹
              </PageButton>
              <span className="px-1.5 text-xs text-muted-foreground">
                Página {dados.pagina} de {dados.paginas}
              </span>
              <PageButton
                disabled={pagina >= dados.paginas}
                onClick={() => setPagina((p) => Math.min(dados.paginas, p + 1))}
              >
                ›
              </PageButton>
              <PageButton disabled={pagina >= dados.paginas} onClick={() => setPagina(dados.paginas)}>
                »
              </PageButton>
            </div>
          </div>
        )}
      </Card>

      <OrderDetailDialog
        open={detalheId !== null}
        onOpenChange={(v) => !v && setDetalheId(null)}
        pedidoId={detalheId}
        motoboys={motoboys}
        phpAdminUrl={phpAdminUrl}
        onAtualizado={carregar}
      />
    </div>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md border text-xs font-semibold text-foreground transition-colors",
        disabled ? "cursor-not-allowed opacity-40" : "hover:border-primary hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}
