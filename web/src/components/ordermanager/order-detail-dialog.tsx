"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Phone, MessageCircle, Copy, Truck, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "./confirm-dialog";
import { LinkMotoboyDialog } from "./link-motoboy-dialog";
import { STATUS_LABELS, TIPO_LABELS, formatBRL, formatTempoRelativo } from "./constants";
import type { Motoboy } from "@/lib/pedidos";
import { cn } from "cn";

type ItemPedido = { produto_nome: string; quantidade: number; preco: number; observacoes: string | null };
type Pagamento = { forma: string; valor: number; taxa_maquininha?: number };
type ClienteStats = {
  pedidos_feitos: number;
  ticket_medio: number;
  cashback_total: number;
  cashback_saldo: number;
  cashback_expira_em: string | null;
  cashback_expirado: boolean;
  pontos: number;
};
type PedidoDetalhe = {
  id: number;
  codigo: number;
  status: string;
  tipo: string;
  criado_em: string;
  nome: string;
  telefone: string;
  endereco_entrega: string | null;
  taxa_entrega: number;
  subtotal: number;
  desconto: number;
  taxa_maquininha: number;
  cashback_usado: number;
  total: number;
  agendamento: string | null;
  observacoes_cliente: string | null;
  motoboy_id: number | null;
  motoboy_nome: string | null;
  motoboy_whatsapp: string | null;
};

export function OrderDetailDialog({
  open,
  onOpenChange,
  pedidoId,
  motoboys,
  phpAdminUrl,
  onAtualizado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedidoId: number | null;
  motoboys: Motoboy[];
  phpAdminUrl: string;
  onAtualizado: () => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const [pedido, setPedido] = useState<PedidoDetalhe | null>(null);
  const [stats, setStats] = useState<ClienteStats | null>(null);
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [motoboyOpen, setMotoboyOpen] = useState(false);

  useEffect(() => {
    if (!open || !pedidoId) return;
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pedidoId]);

  async function carregar() {
    if (!pedidoId) return;
    setCarregando(true);
    try {
      const res = await fetch(`/api/ordermanager/pedido-detalhe?id=${pedidoId}`);
      const data = await res.json();
      if (data.ok) {
        setPedido(data.pedido);
        setStats(data.cliente_stats);
        setItens(data.itens ?? []);
        setPagamentos(data.pagamentos ?? []);
      } else {
        toast.error(data.msg ?? "Erro ao carregar o pedido.");
      }
    } finally {
      setCarregando(false);
    }
  }

  async function finalizar() {
    if (!pedidoId) return;
    setFinalizando(true);
    try {
      const res = await fetch("/api/ordermanager/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pedidoId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.msg ?? "Erro ao finalizar o pedido.");
        return;
      }
      toast.success("Pedido finalizado com sucesso.");
      onOpenChange(false);
      onAtualizado();
    } finally {
      setFinalizando(false);
    }
  }

  async function cancelar() {
    if (!pedidoId) return;
    setCancelando(true);
    try {
      const res = await fetch("/api/ordermanager/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pedidoId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.msg ?? "Erro ao cancelar o pedido.");
        return;
      }
      toast.success("Pedido cancelado.");
      setCancelarOpen(false);
      onOpenChange(false);
      onAtualizado();
    } finally {
      setCancelando(false);
    }
  }

  function copiarEndereco() {
    if (!pedido?.endereco_entrega) return;
    navigator.clipboard?.writeText(pedido.endereco_entrega);
    toast.success("Endereço copiado.");
  }

  const finalizavel = pedido && pedido.status !== "finalizado" && pedido.status !== "cancelado";
  const telHref = pedido?.telefone ? `tel:${pedido.telefone.replace(/\D/g, "")}` : undefined;
  const waHref = pedido?.telefone ? `https://wa.me/55${pedido.telefone.replace(/\D/g, "")}` : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg gap-3 overflow-hidden sm:max-w-lg">
          <div className="max-h-[75vh] overflow-y-auto overflow-x-hidden pr-1">
            <DialogHeader className="pr-8">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle>Pedido N. {pedido?.codigo ?? "-"}</DialogTitle>
                {pedido && (
                  <a
                    href={`${phpAdminUrl}/pdv?pedido_id=${pedido.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Editar pedido <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </DialogHeader>

            {carregando && !pedido ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : pedido ? (
              <div className="flex flex-col gap-4 pt-2 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>feito {formatTempoRelativo(pedido.criado_em)}</span>
                  <Badge variant="outline">{STATUS_LABELS[pedido.status] ?? pedido.status}</Badge>
                </div>

                {pedido.agendamento && (
                  <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700">
                    Agendado para: {pedido.agendamento}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Cliente</span>
                    <span className="font-medium">{pedido.nome}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Telefone</span>
                    <span className="font-medium">{pedido.telefone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={telHref}
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }), "flex-1")}
                  >
                    <Phone size={13} /> Ligar
                  </a>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }), "flex-1")}
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                </div>

                {stats && (
                  <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Pedidos feitos</div>
                      <div className="font-semibold">{stats.pedidos_feitos}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Ticket médio</div>
                      <div className="font-semibold">{formatBRL(stats.ticket_medio)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Pontos</div>
                      <div className="font-semibold">{stats.pontos}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cashback</div>
                      <div className="font-semibold">{formatBRL(stats.cashback_saldo)}</div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 border-t pt-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {TIPO_LABELS[pedido.tipo] ?? pedido.tipo}
                  </div>
                  {pedido.tipo === "entrega" && (
                    <>
                      {pedido.endereco_entrega && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Endereço</span>
                          <button
                            type="button"
                            onClick={copiarEndereco}
                            className="flex items-center gap-1 text-right font-medium hover:text-primary"
                          >
                            {pedido.endereco_entrega} <Copy size={11} />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Taxa de entrega</span>
                        <span className="font-medium">{formatBRL(pedido.taxa_entrega)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Motoboy</span>
                        <button
                          type="button"
                          onClick={() => setMotoboyOpen(true)}
                          className="flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          <Truck size={12} />
                          {pedido.motoboy_nome ?? "Vincular"}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 border-t pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    Pagamento
                  </div>
                  {pagamentos.length > 0 ? (
                    pagamentos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{p.forma}</span>
                        <span className="font-medium">{formatBRL(p.valor)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>

                {pedido.observacoes_cliente && (
                  <div className="flex flex-col gap-1 border-t pt-3">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Observações do cliente
                    </div>
                    <p className="text-sm">{pedido.observacoes_cliente}</p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 border-t pt-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Resumo do pedido
                  </div>
                  <div className="flex flex-col gap-1">
                    {itens.map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-sm">
                        <span>
                          {item.quantidade}x {item.produto_nome}
                          {item.observacoes && (
                            <span className="block text-xs text-muted-foreground">{item.observacoes}</span>
                          )}
                        </span>
                        <span className="shrink-0 font-medium">{formatBRL(item.preco * item.quantidade)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex flex-col gap-1 border-t pt-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium">{formatBRL(pedido.subtotal)}</span>
                    </div>
                    {Number(pedido.desconto) > 0 && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Desconto</span>
                        <span>-{formatBRL(pedido.desconto)}</span>
                      </div>
                    )}
                    {Number(pedido.taxa_entrega) > 0 && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Taxa de entrega</span>
                        <span>{formatBRL(pedido.taxa_entrega)}</span>
                      </div>
                    )}
                    {Number(pedido.taxa_maquininha) > 0 && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Taxa maquininha</span>
                        <span>{formatBRL(pedido.taxa_maquininha)}</span>
                      </div>
                    )}
                    {Number(pedido.cashback_usado) > 0 && (
                      <div className="flex items-center justify-between font-medium">
                        <span>Cashback usado</span>
                        <span>-{formatBRL(pedido.cashback_usado)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-base font-bold">
                      <span>Total</span>
                      <span>{formatBRL(pedido.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Pedido não encontrado.</p>
            )}
          </div>

          {pedido && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelarOpen(true)} disabled={pedido.status === "cancelado"}>
                Cancelar pedido
              </Button>
              {finalizavel && (
                <Button onClick={finalizar} disabled={finalizando}>
                  {finalizando ? "Aguarde..." : "Mover para finalizado"}
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelarOpen}
        onOpenChange={setCancelarOpen}
        titulo="Cancelar pedido?"
        descricao={
          <>
            O pedido <strong>#{pedido?.codigo}</strong> será marcado como cancelado e não poderá ser
            revertido.
          </>
        }
        confirmando={cancelando}
        textoConfirmar="Cancelar pedido"
        onConfirmar={cancelar}
      />

      {pedido && (
        <LinkMotoboyDialog
          open={motoboyOpen}
          onOpenChange={setMotoboyOpen}
          pedidoId={pedido.id}
          pedidoNome={`#${pedido.codigo} · ${pedido.nome}`}
          motoboys={motoboys}
          motoboyAtualId={pedido.motoboy_id}
          onVinculado={(motoboyId, motoboyNome) => {
            setPedido((prev) => (prev ? { ...prev, motoboy_id: motoboyId, motoboy_nome: motoboyNome || null } : prev));
            onAtualizado();
          }}
        />
      )}
    </>
  );
}
