"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, MapPin, Receipt, Share2, ShoppingBag, Star, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { StoreSheet } from "@/components/store/store-sheet";
import { StoreAvaliacaoModal } from "@/components/store/store-avaliacao-modal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useStoreTheme } from "@/components/store/store-theme";
import { formatarPreco } from "@/lib/store/format";
import type { StoreMesaStatusResposta, StorePedidoStatusResposta, StorePedidosClienteResposta, StorePerfil } from "@/lib/store/types";

type PedidoDetalhe = NonNullable<StorePedidoStatusResposta["pedido"]>;

const STATUS_LABELS: Record<string, string> = {
  pendente: "Aguardando confirmação",
  aceito: "Confirmado",
  preparando: "Em preparo",
  entrega: "A caminho",
  finalizado: "Entregue!",
  cancelado: "Cancelado",
};

const STATUS_CORES: Record<string, { bg: string; texto: string; dot: string; pulsa: boolean }> = {
  pendente: { bg: "#fef9c3", texto: "#854d0e", dot: "#f59e0b", pulsa: true },
  aceito: { bg: "#dbeafe", texto: "#1e40af", dot: "#3b82f6", pulsa: true },
  preparando: { bg: "#fef3c7", texto: "#92400e", dot: "#f97316", pulsa: true },
  entrega: { bg: "#ede9fe", texto: "#5b21b6", dot: "#8b5cf6", pulsa: true },
  finalizado: { bg: "#dcfce7", texto: "#166534", dot: "#16a34a", pulsa: false },
  cancelado: { bg: "#fee2e2", texto: "#991b1b", dot: "#dc2626", pulsa: false },
};

function formatarHorario(criadoEm: string): string {
  if (!criadoEm) return "";
  const dt = new Date(criadoEm.replace(" ", "T"));
  if (isNaN(dt.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
}

function formatarHoraCurta(criadoEm: string | null): string {
  if (!criadoEm) return "";
  const dt = new Date(criadoEm.replace(" ", "T"));
  if (isNaN(dt.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

function parseAgendamento(agendRaw: string | null): string {
  if (!agendRaw) return "";
  try {
    const ag = JSON.parse(agendRaw);
    return ag.data ? `${ag.data} ${ag.slot || ""}`.trim() : ag.slot || "";
  } catch {
    const m = agendRaw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]}`;
    return agendRaw;
  }
}

type PedidoResumoItem = { id: number; tipo: string; forma_pagamento: string; total: number; criado_em: string };

export function StorePedidosSheet({
  open,
  onOpenChange,
  perfil,
  cliente,
  pedidosResumo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  perfil: StorePerfil;
  cliente: StorePedidosClienteResposta["cliente"] | null;
  pedidosResumo: PedidoResumoItem[];
}) {
  const { brown } = useStoreTheme();
  /* Acesso via QR Code da mesa (ver mesa-qrcode-dialog.tsx): a conta e compartilhada entre quem
     estiver sentado ali, sem telefone/OTP — "Meus pedidos" vira o status da mesa (todos os pedidos
     feitos nela, de qualquer dispositivo) em vez do historico de UM cliente especifico. */
  const isMesa = perfil.mesaId !== null;
  const [detalhes, setDetalhes] = useState<PedidoDetalhe[] | null>(null);
  const [itensPorPedido, setItensPorPedido] = useState<Record<number, StorePedidoStatusResposta["itens"]>>({});
  const [mesaInfo, setMesaInfo] = useState<NonNullable<StoreMesaStatusResposta["mesa"]> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [pedirContaAberto, setPedirContaAberto] = useState(false);
  const [solicitandoConta, setSolicitandoConta] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Fonte da verdade de "ja avaliado" e o campo p.avaliado (vem do servidor,
     pedido_status.php). Esse Set em localStorage e so um cache otimista pra
     travar o botao na hora, sem esperar o proximo poll confirmar — sozinho
     ele nao seria confiavel (localStorage nao segue entre navegador/aparelho
     e pode ser limpo), diferente do loja.js legado que confiava so nele. */
  const [avaliados, setAvaliados] = useState<Set<number>>(new Set());
  useEffect(() => {
    try {
      const salvos = JSON.parse(localStorage.getItem(`lc_aval_${perfil.loja_id}`) || "[]");
      setAvaliados(new Set(salvos));
    } catch {
      // ignora
    }
  }, [perfil.loja_id]);

  const [avaliacaoAberta, setAvaliacaoAberta] = useState(false);
  const [avaliacaoPedidoId, setAvaliacaoPedidoId] = useState<number | null>(null);

  async function buscarCards() {
    const clienteId = cliente?.id ?? 0;
    const resultados = await Promise.all(
      pedidosResumo.map(async (h) => {
        try {
          const res = await fetch(`/api/store/pedido-status?id=${h.id}${clienteId ? `&cliente_id=${clienteId}` : ""}`);
          const data: StorePedidoStatusResposta = await res.json();
          return data.ok && data.pedido ? data : null;
        } catch {
          return null;
        }
      })
    );
    const pedidosOk = resultados.filter((r): r is StorePedidoStatusResposta => r !== null && !!r.pedido);
    setDetalhes(pedidosOk.map((r) => r.pedido!));
    const itensMap: Record<number, StorePedidoStatusResposta["itens"]> = {};
    pedidosOk.forEach((r) => {
      itensMap[r.pedido!.id] = r.itens ?? [];
    });
    setItensPorPedido(itensMap);
  }

  async function buscarMesaStatus() {
    if (perfil.mesaId === null) return;
    try {
      const res = await fetch(`/api/store/mesa-status?loja_id=${perfil.loja_id}&mesa_id=${perfil.mesaId}`);
      const data: StoreMesaStatusResposta = await res.json();
      if (!data.ok) return;
      setMesaInfo(data.mesa ?? null);
      const pedidosOk = data.pedidos ?? [];
      setDetalhes(pedidosOk.map((p) => p.pedido));
      const itensMap: Record<number, StorePedidoStatusResposta["itens"]> = {};
      pedidosOk.forEach((p) => {
        itensMap[p.pedido.id] = p.itens;
      });
      setItensPorPedido(itensMap);
    } catch {
      // mantem o estado anterior — proximo poll tenta de novo
    }
  }

  useEffect(() => {
    if (!open) return;
    const buscar = isMesa ? buscarMesaStatus : buscarCards;
    if (!isMesa && pedidosResumo.length === 0) return;

    setCarregando(true);
    buscar().finally(() => setCarregando(false));

    pollTimerRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      buscar();
    }, isMesa ? 8000 : 12000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pedidosResumo, isMesa]);

  useEffect(() => {
    if (!detalhes || !pollTimerRef.current) return;
    const todosFinais = detalhes.every((p) => p.status === "finalizado" || p.status === "cancelado");
    if (todosFinais) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, [detalhes]);

  function copiarPix() {
    if (!perfil.pixChave) return;
    navigator.clipboard
      ?.writeText(perfil.pixChave)
      .then(() => toast.success("A chave Pix foi copiada!"))
      .catch(() => toast.error("Não foi possível copiar a chave Pix."));
  }

  /* Compartilha o mesmo link que a pessoa abriu (QR Code da mesa) — quem receber entra direto
     nesse cardapio ja vinculado a mesa e consegue pedir/ver a conta junto. */
  function compartilharMesa() {
    const link = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${perfil.nomeLoja} — ${mesaInfo?.nome ?? "Mesa"}`, url: link }).catch(() => {});
      return;
    }
    navigator.clipboard
      ?.writeText(link)
      .then(() => toast.success("Link da mesa copiado!"))
      .catch(() => toast.error("Não foi possível copiar o link."));
  }

  async function confirmarPedirConta() {
    if (perfil.mesaId === null) return;
    setSolicitandoConta(true);
    try {
      const res = await fetch("/api/store/mesa-conta-solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loja_id: perfil.loja_id, mesa_id: perfil.mesaId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMesaInfo((atual) => (atual ? { ...atual, conta_solicitada: true } : atual));
        setPedirContaAberto(false);
      } else {
        toast.error(data.msg ?? "Não foi possível pedir a conta.");
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSolicitandoConta(false);
    }
  }

  const pedidosAbertosMesa = (detalhes ?? []).filter((p) => p.status !== "finalizado" && p.status !== "cancelado");
  const itensTotalMesa = pedidosAbertosMesa.reduce((s, p) => s + (itensPorPedido[p.id] ?? []).reduce((s2, i) => s2 + i.quantidade, 0), 0);
  const totalMesa = pedidosAbertosMesa.reduce((s, p) => s + p.total, 0);

  return (
    <StoreSheet open={open} onOpenChange={onOpenChange} title={isMesa ? (mesaInfo?.nome ?? "Mesa") : "Meus pedidos"} onBack={() => onOpenChange(false)}>
      <div className="p-4">
        {isMesa && mesaInfo && pedidosAbertosMesa.length > 0 && (
          <div className="mb-3.5 space-y-2.5 border-b border-neutral-100 pb-3.5">
            <div className="rounded-[14px] border border-neutral-100 p-3.5">
              <div className="mb-2 flex items-center gap-2 text-[.86rem] font-bold text-neutral-900">
                <UtensilsCrossed size={16} className="shrink-0" style={{ color: brown }} />
                {mesaInfo.nome}
                {mesaInfo.aberta_em && <span className="font-normal text-neutral-400">• Aberta às {formatarHoraCurta(mesaInfo.aberta_em)}</span>}
              </div>
              <div className="flex items-center gap-1.5 text-[.8rem] text-neutral-600">
                <span>
                  Itens: <span className="font-semibold text-neutral-900">{itensTotalMesa}</span>
                </span>
                <span className="text-neutral-300">•</span>
                <span>
                  Total: <span className="font-semibold text-neutral-900">{formatarPreco(totalMesa)}</span>
                  {perfil.taxaServicoAtiva && perfil.taxaServicoPct > 0 && (
                    <span className="text-neutral-400"> (+{perfil.taxaServicoPct}%)</span>
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={compartilharMesa}
              className="flex w-full items-center gap-3 rounded-[14px] border border-neutral-100 p-3.5 text-left"
            >
              <Share2 size={16} className="shrink-0 text-neutral-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[.84rem] font-bold text-neutral-900">Compartilhar o acesso à mesa</p>
                <p className="text-[.74rem] text-neutral-400">Clique aqui e acesse em outros dispositivos</p>
              </div>
            </button>

            {mesaInfo.conta_solicitada ? (
              <div className="rounded-[14px] bg-neutral-50 px-4 py-5 text-center">
                <p className="text-[.86rem] font-bold text-neutral-900">Só um instante</p>
                <p className="text-[.8rem] text-neutral-500">um garçom irá trazer sua conta</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPedirContaAberto(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-full py-3 text-[.84rem] font-bold tracking-wide text-white uppercase"
                style={{ background: brown }}
              >
                <Receipt size={15} /> Pedir a conta
              </button>
            )}
          </div>
        )}

        {cliente && (
          <div className="mb-3.5 flex items-center gap-2.5 border-b border-neutral-100 pb-3.5">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[.9rem] font-extrabold text-white"
              style={{ background: brown }}
            >
              {cliente.nome.charAt(0)}
            </div>
            <div>
              <p className="text-[.84rem] font-bold text-neutral-900">{cliente.nome}</p>
              <p className="text-[.72rem] text-neutral-400">{cliente.telefone}</p>
            </div>
          </div>
        )}

        {carregando && (
          <p className="py-5 text-center text-[.82rem] text-neutral-400">Carregando...</p>
        )}

        {!carregando && (!detalhes || detalhes.length === 0) && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-neutral-300">
            <ShoppingBag size={38} className="opacity-40" />
            <p className="text-[.86rem] text-neutral-400">Nenhum pedido encontrado.</p>
          </div>
        )}

        {!carregando && detalhes && detalhes.length > 0 && (
          <div className="space-y-3.5">
            {detalhes.map((p) => {
              const cor = STATUS_CORES[p.status] ?? STATUS_CORES.pendente;
              const label = STATUS_LABELS[p.status] ?? p.status;
              const isEntrega = (p.tipo || "").toLowerCase() === "entrega";
              const itens = itensPorPedido[p.id] ?? [];

              const agendRaw = p.agendamento || p.agendamento_em || null;
              const tipoAgend = p.tipo_agendamento || "";
              const isAgendado = tipoAgend === "entrega_agendada" || tipoAgend === "retirada_agendada" || !!agendRaw;
              const agendSlot = parseAgendamento(agendRaw);
              const previsao = isAgendado && agendSlot
                ? agendSlot
                : isEntrega
                  ? `${perfil.tEntMin} e ${perfil.tEntMax} minutos`
                  : `${perfil.tRetMin} e ${perfil.tRetMax} minutos`;
              const labelPrevisao = isAgendado
                ? isEntrega
                  ? "Entrega agendada para"
                  : "Retirada agendada para"
                : isEntrega
                  ? "Previsão para entrega"
                  : "Previsão para retirada";

              const somaItens = itens.reduce((s, i) => s + Number(i.preco) * i.quantidade, 0);
              const cbGanho = Math.round(Math.max(0, somaItens * ((perfil.cashbackPct || 0) / 100)) * 100) / 100;
              const cbCalc = Math.round(Math.max(0, somaItens + p.taxa_entrega - p.desconto - p.total) * 100) / 100;
              const cbUsado = (p.cashback_usado ?? 0) > 0 ? p.cashback_usado! : cbCalc;

              const isDin = (p.forma_pagamento || "").toLowerCase() === "dinheiro";
              const trocoV = p.troco ?? 0;
              const trocoTroco = trocoV > 0 && trocoV - p.total > 0 ? trocoV - p.total : 0;

              const mostrarPix = p.forma_pagamento === "pix" && perfil.pixChave && p.status !== "finalizado" && p.status !== "cancelado";

              const endEndereco = isEntrega ? p.endereco_entrega || "" : perfil.enderecoLoja || "";
              const endLabel = isEntrega ? "Endereço para entrega:" : "Endereço para retirada:";
              const mapsUrl = isEntrega
                ? `https://maps.google.com/?q=${encodeURIComponent(endEndereco)}`
                : `https://maps.google.com/?q=${encodeURIComponent(perfil.enderecoLoja || perfil.nomeLoja)}`;

              const pagLabel =
                { pix: "Transferência Pix", dinheiro: "Dinheiro", credito: "Cartão de crédito", debito: "Cartão de débito" }[p.forma_pagamento] ||
                p.forma_pagamento ||
                "";

              return (
                <div key={p.id} className="rounded-[14px] border border-neutral-100 p-4 pb-3.5">
                  <div className="mb-2.5 flex items-start justify-between gap-2">
                    <span className="text-[.88rem] font-medium text-neutral-900">N. pedido: {p.codigo}</span>
                    <span
                      className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-[.72rem] font-semibold"
                      style={{ background: cor.bg, color: cor.texto }}
                    >
                      <span className={`size-2 rounded-full ${cor.pulsa ? "animate-pulse" : ""}`} style={{ background: cor.dot }} />
                      {label}
                    </span>
                  </div>

                  {p.status !== "cancelado" && (
                    <div className="border-t border-neutral-100 py-2.5 first:border-t-0 first:pt-0">
                      <p className="mb-0.5 text-[.72rem] text-neutral-400">{labelPrevisao}</p>
                      <p className="text-[.84rem] font-semibold text-neutral-900">{previsao}</p>
                    </div>
                  )}

                  {p.criado_em && (
                    <div className="border-t border-neutral-100 py-2.5">
                      <p className="mb-0.5 text-[.72rem] text-neutral-400">Horário do pedido</p>
                      <p className="text-[.84rem] text-neutral-800">{formatarHorario(p.criado_em)}</p>
                    </div>
                  )}

                  {mostrarPix && (
                    <div className="border-t border-neutral-100 py-2.5">
                      <p className="mb-0.5 text-[.72rem] text-neutral-400">Chave Pix para transferência</p>
                      <p className="mb-0.5 text-[.9rem] break-all text-neutral-900">{perfil.pixChave}</p>
                      {perfil.pixNome && <p className="mb-2.5 text-[.78rem] text-neutral-500">{perfil.pixNome}</p>}
                      <button
                        type="button"
                        onClick={copiarPix}
                        className="flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[.82rem] font-normal text-white"
                        style={{ background: brown }}
                      >
                        <Copy size={14} /> Copiar chave pix
                      </button>
                    </div>
                  )}

                  <div className="border-t border-neutral-100 py-2.5">
                    <p className="mb-1.5 text-[.72rem] font-medium tracking-wide text-neutral-400 uppercase">Resumo</p>
                    <div className="space-y-1">
                      {itens.map((i, idx) => (
                        <div key={idx} className="flex items-baseline justify-between gap-2 text-[.82rem] text-neutral-600">
                          <span className="min-w-0 flex-1">
                            {i.quantidade}x {i.produto_nome}
                            {i.observacoes?.trim() && <span className="block text-[.72rem] text-neutral-400">{i.observacoes}</span>}
                          </span>
                          <span className="shrink-0 text-neutral-900">{formatarPreco(Number(i.preco) * i.quantidade)}</span>
                        </div>
                      ))}
                      {isEntrega && p.taxa_entrega > 0.009 && (
                        <div className="flex justify-between text-[.82rem] text-neutral-600">
                          <span>Taxa de entrega</span>
                          <span className="text-neutral-900">{formatarPreco(p.taxa_entrega)}</span>
                        </div>
                      )}
                      {p.status === "finalizado" && cbGanho > 0.009 && (
                        <div className="flex justify-between text-[.78rem] text-emerald-600">
                          <span>Cashback ganho:</span>
                          <span>{formatarPreco(cbGanho)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {(cbUsado > 0.009 || p.desconto > 0) && (
                    <div className="border-t border-neutral-100 py-2.5">
                      <p className="mb-1.5 text-[.72rem] font-medium tracking-wide text-neutral-400 uppercase">Descontos de valores</p>
                      {p.desconto > 0 && (
                        <div className="flex justify-between text-[.78rem]" style={{ color: "#7c3aed" }}>
                          <span>Desconto</span>
                          <span>-{formatarPreco(p.desconto)}</span>
                        </div>
                      )}
                      {cbUsado > 0.009 && (
                        <div className="flex justify-between text-[.78rem]" style={{ color: "#7c3aed" }}>
                          <span>Cashback usado</span>
                          <span>-{formatarPreco(cbUsado)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-neutral-100 py-2.5">
                    <p className="mb-1.5 text-[.72rem] font-medium tracking-wide text-neutral-400 uppercase">Pagamentos</p>
                    {isDin ? (
                      <div>
                        <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
                          <div className="flex justify-between text-[.82rem] text-neutral-700">
                            <span>{pagLabel}</span>
                            <span>{formatarPreco(p.total)}</span>
                          </div>
                          {trocoV > 0 ? (
                            <>
                              <div className="flex justify-between text-[.82rem] text-neutral-400">
                                <span>Cliente pagará com</span>
                                <span>{formatarPreco(trocoV)}</span>
                              </div>
                              {trocoTroco > 0 && (
                                <div className="flex justify-between text-[.82rem] font-semibold text-neutral-700">
                                  <span>Troco no valor de</span>
                                  <span>{formatarPreco(trocoTroco)}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex justify-between text-[.82rem] text-neutral-400">
                              <span>Sem troco</span>
                              <span></span>
                            </div>
                          )}
                        </div>
                        <div className="mt-1.5 flex justify-between border-t border-neutral-100 pt-2 text-[.86rem] font-bold text-neutral-900">
                          <span>Total</span>
                          <span>{formatarPreco(p.total)}</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between text-[.82rem] text-neutral-600">
                          <span>{pagLabel}</span>
                          <span className="text-neutral-900">{formatarPreco(p.total)}</span>
                        </div>
                        <div className="mt-1.5 flex justify-between border-t border-neutral-100 pt-2 text-[.86rem] font-bold text-neutral-900">
                          <span>Total</span>
                          <span>{formatarPreco(p.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {endEndereco && (
                    <div className="border-t border-neutral-100 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="mb-0.5 text-[.72rem] text-neutral-400">{endLabel}</p>
                          <p className="text-[.82rem] text-neutral-800">{endEndereco}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.open(mapsUrl, "_blank", "noopener")}
                          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[.78rem] font-normal text-white"
                          style={{ background: brown }}
                        >
                          <MapPin size={13} /> Ver no mapa
                        </button>
                      </div>
                    </div>
                  )}

                  {(p.status === "finalizado" || p.status === "entregue") && (
                    <div className="border-t border-neutral-100 pt-3">
                      {p.avaliado || avaliados.has(p.id) ? (
                        <button
                          type="button"
                          disabled
                          className="flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-full py-2.5 text-[.82rem] font-normal text-white opacity-50"
                          style={{ background: "#c0a88a" }}
                        >
                          <CheckCircle2 size={15} /> Pedido avaliado
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAvaliacaoPedidoId(p.id);
                            setAvaliacaoAberta(true);
                          }}
                          className="flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[.82rem] font-normal text-white"
                          style={{ background: brown }}
                        >
                          <Star size={15} fill="#f59e0b" color="#f59e0b" /> Avaliar pedido
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <StoreAvaliacaoModal
        open={avaliacaoAberta}
        onOpenChange={setAvaliacaoAberta}
        nomeLoja={perfil.nomeLoja}
        lojaId={perfil.loja_id}
        pedidoId={avaliacaoPedidoId}
        horario={formatarHorario((detalhes ?? []).find((p) => p.id === avaliacaoPedidoId)?.criado_em ?? "")}
        itens={
          (itensPorPedido[avaliacaoPedidoId ?? -1] ?? []).map((i) => ({
            produto_nome: i.produto_nome,
            quantidade: i.quantidade,
            preco: i.preco,
          }))
        }
        onAvaliado={(pedidoId) => {
          setAvaliados((prev) => {
            const novo = new Set(prev);
            novo.add(pedidoId);
            try {
              localStorage.setItem(`lc_aval_${perfil.loja_id}`, JSON.stringify([...novo]));
            } catch {
              // ignora
            }
            return novo;
          });
        }}
      />

      <Dialog open={pedirContaAberto} onOpenChange={(v) => !solicitandoConta && setPedirContaAberto(v)}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="backdrop-blur-sm! bg-black/30!"
          className="max-w-xs gap-4 rounded-2xl p-5 text-center sm:max-w-xs"
        >
          <DialogTitle className="text-[1rem] font-bold text-neutral-900">Confirmar fechamento da mesa?</DialogTitle>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setPedirContaAberto(false)}
              disabled={solicitandoConta}
              className="flex-1 rounded-full border-[1.5px] border-neutral-200 py-2.5 text-[.84rem] font-bold text-neutral-700 disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={confirmarPedirConta}
              disabled={solicitandoConta}
              className="flex-1 rounded-full py-2.5 text-[.84rem] font-bold text-white disabled:opacity-60"
              style={{ background: brown }}
            >
              {solicitandoConta ? "Aguarde..." : "Confirmar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </StoreSheet>
  );
}
