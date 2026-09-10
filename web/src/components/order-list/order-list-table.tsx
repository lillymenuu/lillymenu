"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  STATUS_LABELS,
  STATUS_CORES,
  TIPO_LABELS,
  TIPO_CORES,
  formatBRL,
  formatDataHora,
} from "@/components/ordermanager/constants";
import type { Motoboy, Pedido, PedidosListarResposta } from "@/lib/pedidos";

const STATUS_ITEMS: Record<string, string> = {
  "": "Todos",
  ...STATUS_LABELS,
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function paginasVisiveis(paginas: number, pagina: number): (number | "...")[] {
  if (paginas <= 7) {
    return Array.from({ length: paginas }, (_, i) => i + 1);
  }
  const itens: (number | "...")[] = [1];
  if (pagina > 3) itens.push("...");
  const inicio = Math.max(2, pagina - 1);
  const fim = Math.min(paginas - 1, pagina + 1);
  for (let i = inicio; i <= fim; i++) itens.push(i);
  if (pagina < paginas - 2) itens.push("...");
  itens.push(paginas);
  return itens;
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

      <Card>
        <CardContent className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Status</span>
              <Select
                items={STATUS_ITEMS}
                value={status}
                onValueChange={(v) => mudarFiltro(() => setStatus(v ?? ""))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_ITEMS).map(([value, label]) => (
                    <SelectItem key={value || "todos"} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">De</span>
              <Input
                type="date"
                value={dataIni}
                onChange={(e) => mudarFiltro(() => setDataIni(e.target.value))}
                className="w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Até</span>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => mudarFiltro(() => setDataFim(e.target.value))}
                className="w-36"
              />
            </div>
          </div>
          <span className="text-sm text-muted-foreground">
            {total} pedido{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}
          </span>
        </CardContent>
      </Card>

      <Card className="flex-1 gap-0 py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N. pedido</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                Array.from({ length: limite }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-5 w-full animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum pedido encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                pedidos.map((pedido) => {
                  const statusCor = STATUS_CORES[pedido.status] ?? STATUS_CORES.pendente;
                  const formas = pedido.pagamentos?.length
                    ? pedido.pagamentos.map((p) => p.forma)
                    : [pedido.forma_pagamento || "-"];
                  return (
                    <TableRow
                      key={pedido.id}
                      className="cursor-pointer"
                      onClick={() => setDetalheId(pedido.id)}
                    >
                      <TableCell className="font-medium">#{pedido.codigo}</TableCell>
                      <TableCell className="max-w-48 truncate">{pedido.nome}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDataHora(pedido.criado_em)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {formas.map((forma, i) => (
                            <span key={i} className="capitalize">
                              {forma}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="rounded-full px-2 py-1 text-[11px] font-medium"
                          style={{ background: statusCor.bg, color: statusCor.fg }}
                        >
                          {STATUS_LABELS[pedido.status] ?? pedido.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-xs font-semibold tracking-wide"
                          style={{ color: TIPO_CORES[pedido.tipo] ?? "#6b7280" }}
                        >
                          {TIPO_LABELS[pedido.tipo] ?? pedido.tipo?.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatBRL(pedido.total)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Itens por página</span>
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
            <span>
              Mostrando {inicioItem} a {fimItem} de {total} pedidos
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
            >
              ‹
            </Button>
            {paginasVisiveis(paginas, pagina).map((item, i) =>
              item === "..." ? (
                <span key={`e${i}`} className="px-1 text-sm text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  variant={item === pagina ? "default" : "outline"}
                  size="sm"
                  className="w-8"
                  onClick={() => setPagina(item)}
                >
                  {item}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= paginas}
              onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
            >
              ›
            </Button>
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
