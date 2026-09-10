"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Filter, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Motoboy, Pedido } from "@/lib/pedidos";
import { OrderCard } from "./order-card";
import { OrderDetailDialog } from "./order-detail-dialog";
import { OrderSearchDialog } from "./order-search-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { LinkMotoboyDialog } from "./link-motoboy-dialog";
import { COLUNAS, formatBRL } from "./constants";
import { cn } from "cn";

const TIPOS_CICLO = ["todos", "entrega", "retirada", "mesa"] as const;

type FiltroColuna = { tipo: (typeof TIPOS_CICLO)[number]; hoje: boolean };

function snapshot(pedidos: Pedido[]) {
  return pedidos.map((p) => `${p.id}:${p.status}:${p.total}:${p.motoboy_id ?? ""}`).join("|");
}

function ehHoje(iso: string) {
  const d = new Date(iso.replace(" ", "T"));
  const hoje = new Date();
  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate()
  );
}

export function OrderManager({
  pedidosIniciais,
  motoboys,
  phpAdminUrl,
  adminNome,
}: {
  pedidosIniciais: Pedido[];
  motoboys: Motoboy[];
  phpAdminUrl: string;
  adminNome: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [pedidos, setPedidos] = useState(pedidosIniciais);
  const [filtros, setFiltros] = useState<Record<string, FiltroColuna>>(() =>
    Object.fromEntries(COLUNAS.map((c) => [c.status, { tipo: "todos", hoje: false }]))
  );
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [buscaOpen, setBuscaOpen] = useState(false);
  const [recusarId, setRecusarId] = useState<number | null>(null);
  const [recusando, setRecusando] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [alertaMotoboy, setAlertaMotoboy] = useState<Pedido | null>(null);
  const [vincularManual, setVincularManual] = useState<Pedido | null>(null);

  const pausadoRef = useRef(false);
  const arrastandoIdRef = useRef<number | null>(null);
  const ultimoSnapshotRef = useRef(snapshot(pedidosIniciais));

  const carregarPedidos = useCallback(async () => {
    if (pausadoRef.current) return;
    try {
      const res = await fetch("/api/ordermanager/pedidos", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) return;
      const novos: Pedido[] = data.pedidos ?? [];
      const novoSnapshot = snapshot(novos);
      if (novoSnapshot === ultimoSnapshotRef.current) return;
      ultimoSnapshotRef.current = novoSnapshot;
      setPedidos(novos);
    } catch {
      // rede instavel; a proxima chamada do polling tenta de novo
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(carregarPedidos, 5000);
    return () => clearInterval(interval);
  }, [carregarPedidos]);

  useEffect(() => {
    const pedidoParam = searchParams.get("pedido");
    if (pedidoParam) {
      setDetalheId(Number(pedidoParam));
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function moverStatus(id: number, status: string) {
    ultimoSnapshotRef.current = ""; // forca re-render mesmo se o poll ainda nao pegou a mudanca
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    const endpoint = status === "finalizado" ? "/api/ordermanager/finalizar" : "/api/ordermanager/status";
    const body = status === "finalizado" ? { id } : { id, status };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.msg ?? "Erro ao mover o pedido.");
      }
    } finally {
      carregarPedidos();
    }
  }

  function avancar(pedido: Pedido) {
    const proximo: Record<string, string> = {
      pendente: "aceito",
      aceito: "preparando",
      preparando: "entrega",
      entrega: "finalizado",
    };
    const alvo = proximo[pedido.status];
    if (!alvo) return;
    if (alvo === "entrega" && pedido.tipo === "entrega" && !pedido.motoboy_id) {
      setAlertaMotoboy(pedido);
      return;
    }
    moverStatus(pedido.id, alvo);
  }

  async function recusar() {
    if (!recusarId) return;
    setRecusando(true);
    try {
      const res = await fetch("/api/ordermanager/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recusarId, status: "cancelado" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.msg ?? "Erro ao recusar o pedido.");
        return;
      }
      toast.success("Pedido recusado.");
      setRecusarId(null);
      carregarPedidos();
    } finally {
      setRecusando(false);
    }
  }

  function onDragStart(e: React.DragEvent, id: number) {
    e.dataTransfer.setData("text/plain", String(id));
    arrastandoIdRef.current = id;
    pausadoRef.current = true;
  }

  function onDragEnd() {
    arrastandoIdRef.current = null;
    pausadoRef.current = false;
    setDragOverStatus(null);
  }

  function onDrop(e: React.DragEvent, status: string) {
    e.preventDefault();
    setDragOverStatus(null);
    const idStr = e.dataTransfer.getData("text/plain");
    const id = Number(idStr);
    if (!id) return;
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido || pedido.status === status) return;
    if (status === "entrega" && pedido.tipo === "entrega" && !pedido.motoboy_id) {
      setAlertaMotoboy(pedido);
      return;
    }
    moverStatus(id, status);
  }

  function cicloTipo(atual: FiltroColuna["tipo"]): FiltroColuna["tipo"] {
    const i = TIPOS_CICLO.indexOf(atual);
    return TIPOS_CICLO[(i + 1) % TIPOS_CICLO.length];
  }

  const pedidoAlertaAtual = alertaMotoboy;

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Gestor de Pedidos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setBuscaOpen(true)}>
            <Search size={14} /> Buscar pedido
          </Button>
          <a
            href={`${phpAdminUrl}/pdv`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/80"
          >
            <Plus size={14} /> Novo pedido
          </a>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 xl:grid-cols-4">
        {COLUNAS.map((coluna) => {
          const filtro = filtros[coluna.status];
          const pedidosColuna = pedidos.filter((p) => {
            if (p.status !== coluna.status) return false;
            if (filtro.tipo !== "todos" && p.tipo !== filtro.tipo) return false;
            if (filtro.hoje && !ehHoje(p.criado_em)) return false;
            return true;
          });
          const subtotal = pedidosColuna.reduce((acc, p) => acc + Number(p.total || 0), 0);

          return (
            <div
              key={coluna.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(coluna.status);
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === coluna.status ? null : s))}
              onDrop={(e) => onDrop(e, coluna.status)}
              className={cn(
                "flex min-h-[320px] flex-col overflow-hidden rounded-xl border transition-shadow",
                dragOverStatus === coluna.status && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <div className="bg-primary px-3 py-2 text-primary-foreground">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{coluna.label}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Só hoje"
                      onClick={() =>
                        setFiltros((f) => ({ ...f, [coluna.status]: { ...f[coluna.status], hoje: !f[coluna.status].hoje } }))
                      }
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full bg-white/15 hover:bg-white/25",
                        filtro.hoje && "bg-white text-primary"
                      )}
                    >
                      <MoreVertical size={11} />
                    </button>
                    <button
                      type="button"
                      title={`Tipo: ${filtro.tipo}`}
                      onClick={() =>
                        setFiltros((f) => ({ ...f, [coluna.status]: { ...f[coluna.status], tipo: cicloTipo(f[coluna.status].tipo) } }))
                      }
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full bg-white/15 hover:bg-white/25",
                        filtro.tipo !== "todos" && "bg-white text-primary"
                      )}
                    >
                      <Filter size={11} />
                    </button>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg leading-none font-semibold">{pedidosColuna.length}</span>
                  <span className="text-xs font-normal text-white/85">{formatBRL(subtotal)}</span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto bg-muted/30 p-2">
                {pedidosColuna.length === 0 && (
                  <div className="flex flex-1 items-center justify-center py-10 text-center text-xs text-muted-foreground">
                    Nenhum pedido aqui.
                  </div>
                )}
                {pedidosColuna.map((pedido) => (
                  <OrderCard
                    key={pedido.id}
                    pedido={pedido}
                    onAbrir={() => setDetalheId(pedido.id)}
                    onAvancar={() => avancar(pedido)}
                    onRecusar={() => setRecusarId(pedido.id)}
                    onVincularMotoboy={() => setVincularManual(pedido)}
                    onDragStart={(e) => onDragStart(e, pedido.id)}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <OrderDetailDialog
        open={detalheId !== null}
        onOpenChange={(v) => !v && setDetalheId(null)}
        pedidoId={detalheId}
        motoboys={motoboys}
        phpAdminUrl={phpAdminUrl}
        adminNome={adminNome}
        onAtualizado={carregarPedidos}
      />

      <OrderSearchDialog
        open={buscaOpen}
        onOpenChange={setBuscaOpen}
        onSelecionar={(id) => {
          setBuscaOpen(false);
          setDetalheId(id);
        }}
      />

      <ConfirmDialog
        open={recusarId !== null}
        onOpenChange={(v) => !v && setRecusarId(null)}
        titulo="Recusar pedido?"
        descricao="O pedido será marcado como cancelado e não poderá ser revertido."
        confirmando={recusando}
        textoConfirmar="Recusar pedido"
        onConfirmar={recusar}
      />

      {vincularManual && (
        <LinkMotoboyDialog
          open={!!vincularManual}
          onOpenChange={(v) => !v && setVincularManual(null)}
          pedidoId={vincularManual.id}
          pedidoNome={`#${vincularManual.codigo} · ${vincularManual.nome}`}
          motoboys={motoboys}
          motoboyAtualId={vincularManual.motoboy_id}
          onVinculado={() => {
            setVincularManual(null);
            carregarPedidos();
          }}
        />
      )}

      {pedidoAlertaAtual && (
        <LinkMotoboyDialog
          open={!!pedidoAlertaAtual}
          onOpenChange={(v) => !v && setAlertaMotoboy(null)}
          pedidoId={pedidoAlertaAtual.id}
          pedidoNome={`#${pedidoAlertaAtual.codigo} · ${pedidoAlertaAtual.nome}`}
          motoboys={motoboys}
          motoboyAtualId={pedidoAlertaAtual.motoboy_id}
          alerta
          onVinculado={() => {
            moverStatus(pedidoAlertaAtual.id, "entrega");
            setAlertaMotoboy(null);
          }}
          onPular={() => {
            moverStatus(pedidoAlertaAtual.id, "entrega");
            setAlertaMotoboy(null);
          }}
        />
      )}
    </div>
  );
}
