"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, MapPin, ShoppingBag, Star } from "lucide-react";
import { StoreSheet } from "@/components/store/store-sheet";
import { StoreAvaliacaoModal } from "@/components/store/store-avaliacao-modal";
import { useStoreTheme } from "@/components/store/store-theme";
import { formatarPreco } from "@/lib/store/format";
import type { StorePedidoStatusResposta, StorePedidosClienteResposta, StorePerfil } from "@/lib/store/types";

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
  const [detalhes, setDetalhes] = useState<PedidoDetalhe[] | null>(null);
  const [itensPorPedido, setItensPorPedido] = useState<Record<number, StorePedidoStatusResposta["itens"]>>({});
  const [carregando, setCarregando] = useState(true);
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

  useEffect(() => {
    if (!open || pedidosResumo.length === 0) return;
    setCarregando(true);
    buscarCards().finally(() => setCarregando(false));

    pollTimerRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      buscarCards();
    }, 12000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pedidosResumo]);

  useEffect(() => {
    if (!detalhes || !pollTimerRef.current) return;
    const todosFinais = detalhes.every((p) => p.status === "finalizado" || p.status === "cancelado");
    if (todosFinais) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, [detalhes]);

  function copiarPix() {
    if (perfil.pixChave) navigator.clipboard?.writeText(perfil.pixChave).catch(() => {});
  }

  return (
    <StoreSheet open={open} onOpenChange={onOpenChange} title="Meus pedidos" onBack={() => onOpenChange(false)}>
      <div className="p-4">
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
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-[.82rem] font-normal text-white"
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
                          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[.78rem] font-normal text-white"
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
                          className="flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg py-2.5 text-[.82rem] font-normal text-white opacity-50"
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
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-[.82rem] font-normal text-white"
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
    </StoreSheet>
  );
}
