"use client";

import { useEffect, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TIPO_LABELS, TIPO_CORES, formatBRL } from "@/components/ordermanager/constants";
import { formatDataHoraCurta, type ClientePedido } from "./types";

const PERIODOS: Record<string, string> = {
  "7": "Últimos 7 dias",
  "15": "Últimos 15 dias",
  "30": "Últimos 30 dias",
  "60": "Últimos 60 dias",
};

const TIPOS: Record<string, string> = {
  todos: "Todos os tipos",
  entrega: "Entrega",
  retirada: "Retirada",
  mesa: "Mesa",
};

export function ClientePedidosTab({ clienteId }: { clienteId: number }) {
  const [periodo, setPeriodo] = useState("30");
  const [tipo, setTipo] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [pedidos, setPedidos] = useState<ClientePedido[]>([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(1);

  useEffect(() => {
    setPagina(1);
  }, [periodo, tipo]);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    fetch(`/api/cliente/pedidos?id=${clienteId}&periodo=${periodo}&tipo=${tipo}&pagina=${pagina}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelado || !data.ok) return;
        setPedidos(data.pedidos ?? []);
        setTotal(data.total ?? 0);
        setPaginas(data.paginas ?? 1);
      })
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [clienteId, periodo, tipo, pagina]);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-semibold">Pedidos feitos pelo cliente</div>

      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Período dos pedidos
          </span>
          <Select items={PERIODOS} value={periodo} onValueChange={(v) => v && setPeriodo(v)}>
            <SelectTrigger size="sm" className="rounded-lg">
              <CalendarClock size={13} className="text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERIODOS).map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Tipo de pedido
          </span>
          <Select items={TIPOS} value={tipo} onValueChange={(v) => v && setTipo(v)}>
            <SelectTrigger size="sm" className="rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIPOS).map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-xs font-normal text-muted-foreground">
        {carregando ? "Carregando..." : `${total} pedido${total === 1 ? "" : "s"} no período selecionado`}
      </div>

      <div className="flex flex-col gap-2">
        {!carregando && pedidos.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido no período.</p>
        )}
        {pedidos.map((p) => (
          <div key={p.id} className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <CalendarClock size={12} /> Pedido realizado em:
              </span>
              <Badge
                className="text-white"
                style={{ backgroundColor: TIPO_CORES[p.tipo] ?? "#6b7280" }}
              >
                {TIPO_LABELS[p.tipo] ?? p.tipo}
              </Badge>
            </div>
            <div className="font-medium">{formatDataHoraCurta(p.criado_em)}</div>
            <div className="mt-1">
              <div className="text-xs font-normal text-muted-foreground">Resumo do pedido:</div>
              <div className="font-medium">{p.resumo || "-"}</div>
            </div>
            <div className="mt-1 flex items-center justify-between border-t pt-1.5">
              <span className="font-normal text-muted-foreground">Total:</span>
              <span className="font-semibold">{formatBRL(p.total)}</span>
            </div>
          </div>
        ))}
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button
            size="icon-sm"
            variant="outline"
            className="rounded-lg"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="text-xs text-muted-foreground">
            {pagina} / {paginas}
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            className="rounded-lg"
            disabled={pagina >= paginas}
            onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
