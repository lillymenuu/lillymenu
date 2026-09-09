"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Phone,
  MessageCircle,
  Copy,
  Truck,
  Printer,
  XCircle,
  CalendarClock,
  Monitor,
  User,
  PhoneCall,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "./confirm-dialog";
import { LinkMotoboyDialog } from "./link-motoboy-dialog";
import { STATUS_LABELS, TIPO_LABELS, formatBRL, formatTempoRelativo } from "./constants";
import { ClientePerfilDialog } from "@/components/cliente/cliente-perfil-dialog";
import type { Motoboy } from "@/lib/pedidos";
import { cn } from "cn";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function DetalheSkeleton() {
  return (
    <div className="flex flex-col gap-3 pt-1">
      <Skeleton className="mx-auto h-4 w-36" />

      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-7 flex-1 rounded-lg" />
        <Skeleton className="h-7 flex-1 rounded-lg" />
      </div>

      <Skeleton className="h-20 rounded-lg" />

      <div className="flex flex-col gap-1.5 pt-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="flex flex-col gap-1.5 pt-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

function formatDataHora(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  cliente_id: number;
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
  cashback_valor: number;
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
  const [clienteOpen, setClienteOpen] = useState(false);

  useEffect(() => {
    if (!open || !pedidoId) return;
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pedidoId]);

  async function carregar() {
    if (!pedidoId) return;
    setCarregando(true);
    // Limpa o pedido anterior na hora — sem isso, ao trocar de um pedido pro
    // outro o modal continua mostrando os dados antigos ate a resposta nova
    // chegar, dando a impressao de que "demorou" ou trocou errado.
    setPedido(null);
    setStats(null);
    setItens([]);
    setPagamentos([]);
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
          <div className="scrollbar-hidden max-h-[75vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader className="pr-8">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle>Pedido N. {pedido?.codigo ?? "-"}</DialogTitle>
                {pedido && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`${phpAdminUrl}/pdv?pedido_id=${pedido.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-lg font-normal")}
                    >
                      Editar pedido
                    </a>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-lg font-normal")}
                    >
                      <Printer size={13} /> Imprimir
                    </button>
                  </div>
                )}
              </div>
            </DialogHeader>

            {carregando ? (
              <DetalheSkeleton />
            ) : pedido ? (
              <div className="flex flex-col gap-3 pt-1 text-sm">
                <span className="text-center text-sm font-medium text-destructive">
                  feito {formatTempoRelativo(pedido.criado_em)}
                </span>

                {pedido.agendamento && (
                  <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-normal text-amber-700">
                    Agendado para: {pedido.agendamento}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      <CalendarClock size={12} /> Horário do pedido
                    </span>
                    <span className="font-medium">{formatDataHora(pedido.criado_em)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      <Monitor size={12} /> Status do pedido
                    </span>
                    <span className="font-medium text-blue-600">
                      {(STATUS_LABELS[pedido.status] ?? pedido.status).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      <User size={12} /> Nome do cliente
                    </span>
                    <span className="font-medium">{pedido.nome}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      <PhoneCall size={12} /> Telefone
                    </span>
                    <span className="font-medium">{pedido.telefone}</span>
                  </div>
                </div>

                {stats && (
                  <div className="flex flex-col gap-3 rounded-lg border p-2.5 text-sm">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <div className="text-xs font-normal text-muted-foreground">Pedidos feitos</div>
                        <div className="font-medium">{stats.pedidos_feitos}</div>
                      </div>
                      <div>
                        <div className="text-xs font-normal text-muted-foreground">Ticket médio</div>
                        <div className="font-medium">{formatBRL(stats.ticket_medio)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-normal text-muted-foreground">Pontos</div>
                        <div className="font-medium">{stats.pontos}</div>
                      </div>
                      {stats.cashback_saldo > 0 && (
                        <div>
                          <div className="text-xs font-normal text-muted-foreground">Cashback</div>
                          <div className="font-medium">{formatBRL(stats.cashback_saldo)}</div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setClienteOpen(true)}
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-full rounded-lg font-normal")}
                    >
                      Ver mais sobre o cliente
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <a
                    href={telHref}
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                      "h-auto min-w-0 flex-1 rounded-lg py-2 text-center text-xs leading-tight font-normal whitespace-normal"
                    )}
                  >
                    <Phone size={13} className="shrink-0" /> Entrar em contato com o cliente
                  </a>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                      "h-auto min-w-0 flex-1 rounded-lg py-2 text-center text-xs leading-tight font-normal whitespace-normal"
                    )}
                  >
                    <MessageCircle size={13} className="shrink-0" /> Enviar pedido ao WhatsApp
                  </a>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {TIPO_LABELS[pedido.tipo] ?? pedido.tipo}
                  </div>
                  {pedido.tipo === "entrega" && (
                    <>
                      {pedido.endereco_entrega && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-normal text-muted-foreground">Endereço</span>
                          <button
                            type="button"
                            onClick={copiarEndereco}
                            className="flex items-center gap-1 text-right font-normal hover:text-primary"
                          >
                            {pedido.endereco_entrega} <Copy size={11} />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-normal text-muted-foreground">Taxa de entrega</span>
                        <span className="font-normal">{formatBRL(pedido.taxa_entrega)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-normal text-muted-foreground">Motoboy</span>
                        <button
                          type="button"
                          onClick={() => setMotoboyOpen(true)}
                          className="flex items-center gap-1 font-normal text-primary hover:underline"
                        >
                          <Truck size={12} />
                          {pedido.motoboy_nome ?? "Vincular"}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 border-t pt-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Pagamento
                  </div>
                  {pagamentos.length > 0 ? (
                    pagamentos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="font-normal text-muted-foreground">{p.forma}</span>
                        <span className="font-normal">{formatBRL(p.valor)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>

                {pedido.observacoes_cliente && (
                  <div className="flex flex-col gap-1 border-t pt-2.5">
                    <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Observações do cliente
                    </div>
                    <p className="text-sm font-normal">{pedido.observacoes_cliente}</p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 border-t pt-2.5">
                  <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Resumo do pedido
                  </div>
                  <div className="flex flex-col gap-1">
                    {itens.map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-sm">
                        <span className="font-normal">
                          {item.quantidade}x {item.produto_nome}
                          {item.observacoes && (
                            <span className="block text-xs font-normal text-muted-foreground">{item.observacoes}</span>
                          )}
                        </span>
                        <span className="shrink-0 font-normal">{formatBRL(item.preco * item.quantidade)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex flex-col gap-1 border-t pt-2 text-sm">
                    <div className="flex items-center justify-between font-normal">
                      <span>Subtotal</span>
                      <span>{formatBRL(pedido.subtotal)}</span>
                    </div>
                    {Number(pedido.cashback_valor) > 0 && (
                      <div className="flex items-center justify-between font-normal text-muted-foreground">
                        <span>Cashback para o cliente</span>
                        <span>{formatBRL(pedido.cashback_valor)}</span>
                      </div>
                    )}
                    {Number(pedido.desconto) > 0 && (
                      <div className="flex items-center justify-between font-normal text-muted-foreground">
                        <span>Desconto</span>
                        <span>-{formatBRL(pedido.desconto)}</span>
                      </div>
                    )}
                    {Number(pedido.taxa_entrega) > 0 && (
                      <div className="flex items-center justify-between font-normal text-muted-foreground">
                        <span>Taxa de entrega</span>
                        <span>{formatBRL(pedido.taxa_entrega)}</span>
                      </div>
                    )}
                    {Number(pedido.taxa_maquininha) > 0 && (
                      <div className="flex items-center justify-between font-normal text-muted-foreground">
                        <span>Taxa maquininha</span>
                        <span>{formatBRL(pedido.taxa_maquininha)}</span>
                      </div>
                    )}
                    {Number(pedido.cashback_usado) > 0 && (
                      <div className="flex items-center justify-between font-normal">
                        <span>Cashback usado</span>
                        <span>-{formatBRL(pedido.cashback_usado)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-base font-medium">
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
              <Button
                variant="outline"
                size="lg"
                className="rounded-lg font-normal"
                onClick={() => setCancelarOpen(true)}
                disabled={pedido.status === "cancelado"}
              >
                <XCircle size={14} /> Cancelar pedido
              </Button>
              {finalizavel && (
                <Button
                  size="lg"
                  className="rounded-lg font-normal"
                  onClick={finalizar}
                  disabled={finalizando}
                >
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

      <ClientePerfilDialog
        open={clienteOpen}
        onOpenChange={setClienteOpen}
        clienteId={pedido?.cliente_id ?? null}
      />
    </>
  );
}
