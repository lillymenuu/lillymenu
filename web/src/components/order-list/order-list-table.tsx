"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, RotateCcw, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { STATUS_CORES, formatBRL, formatDataHora } from "@/components/ordermanager/constants";
import { DateRangePicker } from "./date-range-picker";
import type { Motoboy, Pedido, PedidosListarResposta } from "@/lib/pedidos";
import { cn } from "cn";

/* Rotulos/cores desta tabela seguem o mesmo padrao visual da tela legada
 * (admin/pedidos.php: mapStatus/mapPagamento + .badge-pill), por isso tem
 * mapas proprios em vez de reaproveitar STATUS_LABELS/TIPO_CORES usados no
 * kanban e no modal de detalhe (que usam outra convencao de cores/rotulos). */
const STATUS_LABELS_TABELA: Record<string, string> = {
  pendente: "Pendente",
  aceito: "Aceito",
  preparando: "Em preparo",
  entrega: "Em entrega",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const STATUS_ITEMS: Record<string, string> = {
  "": "Todos os status",
  ...STATUS_LABELS_TABELA,
};

const PAGAMENTO_LABELS: Record<string, string> = {
  pix: "Transferência Pix",
  dinheiro: "Dinheiro",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
};

const PAGAMENTO_CORES: Record<string, { bg: string; fg: string }> = {
  pix: { bg: "#dbeafe", fg: "#2563eb" },
  dinheiro: { bg: "#dcfce7", fg: "#16a34a" },
  credito: { bg: "#ede9fe", fg: "#6d28d9" },
  debito: { bg: "#e0f2fe", fg: "#0284c7" },
};

const TIPO_PILL: Record<string, { label: string; bg: string; fg: string }> = {
  entrega: { label: "Entrega", bg: "#fde68a", fg: "#92400e" },
  retirada: { label: "Retirada", bg: "#dbeafe", fg: "#2563eb" },
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function OrderListTable({
  pedidosIniciais,
  totalInicial,
  paginasInicial,
  motoboys,
  phpAdminUrl,
}: {
  pedidosIniciais: Pedido[];
  totalInicial: number;
  paginasInicial: number;
  motoboys: Motoboy[];
  phpAdminUrl: string;
}) {
  const [status, setStatus] = useState("");
  const [dataIni, setDataIni] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);

  const [pedidos, setPedidos] = useState(pedidosIniciais);
  const [total, setTotal] = useState(totalInicial);
  const [paginas, setPaginas] = useState(paginasInicial);
  const [carregando, setCarregando] = useState(false);

  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [zerarOpen, setZerarOpen] = useState(false);
  const [zerando, setZerando] = useState(false);

  const primeiraRenderRef = useRef(true);

  async function carregar() {
    setCarregando(true);
    try {
      const qs = new URLSearchParams({
        pagina: String(pagina),
        limite: String(limite),
      });
      if (status) qs.set("status", status);
      if (dataIni) qs.set("data_ini", dataIni);
      if (dataFim) qs.set("data_fim", dataFim);

      const res = await fetch(`/api/order-list/pedidos?${qs.toString()}`, { cache: "no-store" });
      const data: PedidosListarResposta & { ok: boolean; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar os pedidos.");
        return;
      }
      setPedidos(data.pedidos);
      setTotal(data.total);
      setPaginas(data.paginas);
    } catch {
      toast.error("Erro ao carregar os pedidos.");
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
  }, [status, dataIni, dataFim, pagina, limite]);

  function mudarFiltro(fn: () => void) {
    fn();
    setPagina(1);
  }

  async function confirmarZerarSequencia() {
    setZerando(true);
    try {
      const res = await fetch("/api/order-list/zerar-sequencia", { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao zerar a sequência.");
        return;
      }
      toast.success(data.msg ?? "Sequência zerada!");
      setZerarOpen(false);
      carregar();
    } catch {
      toast.error("Erro ao zerar a sequência.");
    } finally {
      setZerando(false);
    }
  }

  const inicioItem = total === 0 ? 0 : (pagina - 1) * limite + 1;
  const fimItem = Math.min(pagina * limite, total);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Lista de Pedidos</h1>
          <p className="text-sm text-muted-foreground">Histórico completo de pedidos da loja.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZerarOpen(true)}>
            <RotateCcw size={14} /> Zerar sequência de pedidos
          </Button>
          <a
            href={`${phpAdminUrl}/pdv`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/80"
          >
            <Plus size={14} /> PDV - Lançar pedido
          </a>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[0.95rem] font-bold">Filtros para pedidos</div>
            <div className="text-xs text-muted-foreground">
              {total} pedido{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              items={STATUS_ITEMS}
              value={status}
              onValueChange={(v) => mudarFiltro(() => setStatus(v ?? ""))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_ITEMS).map(([value, label]) => (
                  <SelectItem key={value || "todos"} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 gap-0 rounded-2xl py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[0.66rem] tracking-wide text-muted-foreground uppercase">
                  N. pedido
                </TableHead>
                <TableHead className="text-[0.66rem] tracking-wide text-muted-foreground uppercase">
                  Nome
                </TableHead>
                <TableHead className="text-[0.66rem] tracking-wide text-muted-foreground uppercase">
                  Data
                </TableHead>
                <TableHead className="text-[0.66rem] tracking-wide text-muted-foreground uppercase">
                  Pagamento
                </TableHead>
                <TableHead className="text-[0.66rem] tracking-wide text-muted-foreground uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[0.66rem] tracking-wide text-muted-foreground uppercase">
                  Tipo
                </TableHead>
                <TableHead className="text-[0.66rem] tracking-wide text-muted-foreground uppercase">
                  Valor
                </TableHead>
                <TableHead className="text-[0.66rem] tracking-wide text-muted-foreground uppercase">
                  Ação
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                Array.from({ length: limite }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <div className="h-5 w-full animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhum pedido encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                pedidos.map((pedido) => {
                  const statusCor = STATUS_CORES[pedido.status] ?? STATUS_CORES.pendente;
                  const tipoPill = TIPO_PILL[pedido.tipo] ?? TIPO_PILL.retirada;
                  const formas = pedido.pagamentos?.length
                    ? pedido.pagamentos.map((p) => p.forma)
                    : [pedido.forma_pagamento || ""];
                  return (
                    <TableRow
                      key={pedido.id}
                      className="cursor-pointer"
                      onClick={() => setDetalheId(pedido.id)}
                    >
                      <TableCell className="font-medium">
                        <span
                          className="mr-1.5 inline-block size-2 rounded-full align-middle"
                          style={{ background: "#9c5523" }}
                        />
                        #{pedido.codigo}
                      </TableCell>
                      <TableCell className="max-w-48 truncate">{pedido.nome}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDataHora(pedido.criado_em)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {formas.map((forma, i) => {
                            const cor = PAGAMENTO_CORES[forma] ?? { bg: "#f1f5f9", fg: "#64748b" };
                            return (
                              <span
                                key={i}
                                className="w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                style={{ background: cor.bg, color: cor.fg }}
                              >
                                {PAGAMENTO_LABELS[forma] ?? forma ?? "-"}
                              </span>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ background: statusCor.bg, color: statusCor.fg }}
                        >
                          {STATUS_LABELS_TABELA[pedido.status] ?? pedido.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ background: tipoPill.bg, color: tipoPill.fg }}
                        >
                          {tipoPill.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{formatBRL(pedido.total)}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetalheId(pedido.id);
                          }}
                          className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted/70"
                        >
                          <Printer size={11} /> Imprimir
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Itens por página:</span>
            <Select
              items={{ "10": "10", "20": "20", "50": "50" }}
              value={String(limite)}
              onValueChange={(v) => mudarFiltro(() => setLimite(Number(v ?? 10)))}
            >
              <SelectTrigger size="sm" className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-xs text-muted-foreground">
            Mostrando {inicioItem} a {fimItem} de {total} pedidos
          </span>

          <div className="flex items-center gap-1">
            <PageButton disabled={pagina <= 1} onClick={() => setPagina(1)}>
              «
            </PageButton>
            <PageButton disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
              ‹
            </PageButton>
            <span className="px-1.5 text-xs text-muted-foreground">
              Página {pagina} de {paginas}
            </span>
            <PageButton
              disabled={pagina >= paginas}
              onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
            >
              ›
            </PageButton>
            <PageButton disabled={pagina >= paginas} onClick={() => setPagina(paginas)}>
              »
            </PageButton>
          </div>
        </div>
      </Card>

      <OrderDetailDialog
        open={detalheId !== null}
        onOpenChange={(v) => !v && setDetalheId(null)}
        pedidoId={detalheId}
        motoboys={motoboys}
        phpAdminUrl={phpAdminUrl}
        onAtualizado={carregar}
      />

      <ConfirmDialog
        open={zerarOpen}
        onOpenChange={setZerarOpen}
        titulo="Zerar sequência de pedidos"
        descricao="O próximo pedido criado passará a ser o #1. Essa ação não pode ser desfeita."
        confirmando={zerando}
        textoConfirmar="Zerar sequência"
        onConfirmar={confirmarZerarSequencia}
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
