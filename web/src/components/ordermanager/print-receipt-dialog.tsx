"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, MapPin, Phone, Truck, User } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { STATUS_LABELS, TIPO_LABELS, TIPO_CORES, formatBRL, formatDataHora } from "./constants";
import { cn } from "cn";

const ORIGEM_LABELS: Record<string, string> = {
  balcao: "pelo balcão",
  loja: "pela loja",
  online: "online",
  site: "pelo site",
  whatsapp: "pelo WhatsApp",
};

type ItemOpcaoSelecionada = { tipo: "variacao" | "grupo"; grupo_id: number | null; referencia_id: number; titulo: string; nome: string };
type ItemPedido = { produto_id: number | null; produto_nome: string; quantidade: number; preco: number; observacoes: string | null; opcoes: ItemOpcaoSelecionada[] };
type Pagamento = { forma: string; valor: number };
type PedidoDetalhe = {
  id: number;
  codigo: number;
  status: string;
  tipo: string;
  origem: string | null;
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
  motoboy_nome: string | null;
};

/* Nome base do produto, sem a variacao/opcoes concatenadas no final — mesma logica de
   order-detail-dialog.tsx (duplicada aqui de proposito: sao helpers de apresentacao pequenos,
   igual ao padrao ja usado em vendasPdf.ts/orcamentoPdf.ts). */
function nomeBaseItem(produtoNome: string): string {
  const idx = produtoNome.search(/ - | \+ /);
  return idx === -1 ? produtoNome : produtoNome.slice(0, idx);
}

function agruparOpcoes(opcoes: ItemOpcaoSelecionada[]): { titulo: string; nomes: string[] }[] {
  const grupos: { titulo: string; nomes: string[] }[] = [];
  for (const o of opcoes) {
    let grupo = grupos.find((g) => g.titulo === o.titulo);
    if (!grupo) {
      grupo = { titulo: o.titulo, nomes: [] };
      grupos.push(grupo);
    }
    grupo.nomes.push(o.nome);
  }
  return grupos;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function PrintReceiptDialog({
  open,
  onOpenChange,
  pedidoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedidoId: number | null;
}) {
  const [carregando, setCarregando] = useState(false);
  const [pedido, setPedido] = useState<PedidoDetalhe | null>(null);
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);

  useEffect(() => {
    if (!open || !pedidoId) return;
    carregar(pedidoId);
  }, [open, pedidoId]);

  function carregar(id: number) {
    setCarregando(true);
    setPedido(null);
    setItens([]);
    setPagamentos([]);
    fetch(`/api/ordermanager/pedido-detalhe?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          toast.error(data.msg ?? "Erro ao carregar o pedido.");
          return;
        }
        setPedido(data.pedido);
        setItens(data.itens ?? []);
        setPagamentos(data.pagamentos ?? []);
      })
      .finally(() => setCarregando(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl p-0 ring-0 shadow-2xl sm:max-w-xl" showCloseButton>
        <div className="scrollbar-hidden max-h-[90vh] overflow-y-auto bg-white text-slate-900">
          {carregando ? (
            <div className="flex flex-col gap-4 p-8">
              <Skeleton className="mx-auto h-5 w-40" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : pedido ? (
            <div className="flex flex-col gap-6 p-8">
              {/* Cabecalho da nota */}
              <div className="flex flex-col items-center gap-1 border-b border-dashed border-slate-300 pb-5 text-center">
                <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Nota do pedido</span>
                <h2 className="text-3xl font-bold tracking-tight">Pedido #{pedido.codigo}</h2>
                <div className="mt-1 flex items-center gap-2 text-xs font-medium">
                  <span style={{ color: TIPO_CORES[pedido.tipo] ?? undefined }} className="font-semibold tracking-wide">
                    {TIPO_LABELS[pedido.tipo] ?? pedido.tipo?.toUpperCase()}
                  </span>
                  {pedido.origem && <span className="text-slate-400">· {ORIGEM_LABELS[pedido.origem] ?? pedido.origem}</span>}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span>{formatDataHora(pedido.criado_em)}</span>
                  <span>•</span>
                  <span className="font-medium text-blue-600">{(STATUS_LABELS[pedido.status] ?? pedido.status).toUpperCase()}</span>
                </div>
              </div>

              {pedido.agendamento && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700">
                  Agendado para: {formatDataHora(pedido.agendamento)}
                </div>
              )}

              {/* Cliente / entrega */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2 rounded-lg border border-slate-200 p-3">
                  <User size={14} className="mt-0.5 shrink-0 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">Cliente</span>
                    <span className="text-sm font-medium">{pedido.nome}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Phone size={10} /> {pedido.telefone}
                    </span>
                  </div>
                </div>
                {pedido.tipo === "entrega" && (
                  <div className="flex items-start gap-2 rounded-lg border border-slate-200 p-3">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">Endereço de entrega</span>
                      <span className="text-sm font-medium">{pedido.endereco_entrega ?? "-"}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Truck size={10} /> {pedido.motoboy_nome ?? "Sem entregador vinculado"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Itens */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-medium tracking-widest text-slate-400 uppercase">Itens do pedido</span>
                <div className="flex flex-col divide-y divide-dashed divide-slate-200 rounded-lg border border-slate-200">
                  {itens.map((item, i) => {
                    const grupos = agruparOpcoes(item.opcoes);
                    return (
                      <div key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                        <div>
                          <span className="font-medium">
                            {item.quantidade}x {grupos.length > 0 ? nomeBaseItem(item.produto_nome) : item.produto_nome}
                          </span>
                          {grupos.length > 0 && (
                            <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                              {grupos.map((g, gi) => (
                                <div key={gi}>
                                  <span className="font-medium text-slate-600">{g.titulo}:</span> {g.nomes.join(", ")}
                                </div>
                              ))}
                            </div>
                          )}
                          {item.observacoes && <div className="mt-1 text-xs text-slate-500">Obs: {item.observacoes}</div>}
                        </div>
                        <span className="shrink-0 font-medium">{formatBRL(item.preco * item.quantidade)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {pedido.observacoes_cliente && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium tracking-widest text-slate-400 uppercase">Observações do cliente</span>
                  <p className="text-sm">{pedido.observacoes_cliente}</p>
                </div>
              )}

              {/* Totais */}
              <div className="flex flex-col gap-1.5 border-t border-dashed border-slate-300 pt-4 text-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatBRL(pedido.subtotal)}</span>
                </div>
                {Number(pedido.cashback_valor) > 0 && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Cashback para o cliente</span>
                    <span>{formatBRL(pedido.cashback_valor)}</span>
                  </div>
                )}
                {Number(pedido.desconto) > 0 && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Desconto</span>
                    <span>-{formatBRL(pedido.desconto)}</span>
                  </div>
                )}
                {Number(pedido.taxa_entrega) > 0 && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Taxa de entrega</span>
                    <span>{formatBRL(pedido.taxa_entrega)}</span>
                  </div>
                )}
                {Number(pedido.taxa_maquininha) > 0 && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Taxa maquininha</span>
                    <span>{formatBRL(pedido.taxa_maquininha)}</span>
                  </div>
                )}
                {Number(pedido.cashback_usado) > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Cashback usado</span>
                    <span>-{formatBRL(pedido.cashback_usado)}</span>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>{formatBRL(pedido.total)}</span>
                </div>
              </div>

              {/* Pagamento */}
              <div className="flex flex-col gap-1.5 border-t border-dashed border-slate-300 pt-4">
                <span className="text-[10px] font-medium tracking-widest text-slate-400 uppercase">Pagamento</span>
                {pagamentos.length > 0 ? (
                  pagamentos.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-slate-600">{p.forma}</span>
                      <span className="font-medium">{formatBRL(p.valor)}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">-</span>
                )}
              </div>

              <a
                href={`/api/ordermanager/pedido-pdf?id=${pedido.id}`}
                className={cn(buttonVariants({ size: "lg" }), "mt-2 w-full rounded-lg font-normal")}
              >
                <Download size={15} /> Baixar PDF
              </a>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">Pedido não encontrado.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
