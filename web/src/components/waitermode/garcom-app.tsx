"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeftRight, ImageIcon, Info, LogOut, Plus, ReceiptText } from "lucide-react";
import { StoreThemeProvider, useStoreTheme } from "@/components/store/store-theme";
import { StoreProdutoDialog } from "@/components/store/store-produto-dialog";
import { StoreComboDialog } from "@/components/store/store-combo-dialog";
import { StoreSheet } from "@/components/store/store-sheet";
import { QtyStepper } from "@/components/store/qty-stepper";
import { consumoDoCarrinho } from "@/components/store/estoque-carrinho";
import { formatarPreco, maskValorDigitado, parseValorMascarado } from "@/lib/store/format";
import type { StoreCartItem, StoreCategoria, StoreCombo, StoreProduto } from "@/lib/store/types";
import type { MesaGarcom, PedidoAbertoGarcom, PerfilGarcomLoja } from "@/db/queries/modoGarcom";

type Etapa = "mesas" | "cardapio";

const STATUS_LABEL: Record<string, string> = { pendente: "Pendente", aceito: "Aceito", preparando: "Preparando", entrega: "Pronto" };

export function GarcomApp({
  lojaId,
  slug,
  garcomNome,
  perfil,
  mesas,
  categorias,
  produtosPorCat,
  combosPorCat,
}: {
  lojaId: number;
  slug: string;
  garcomNome: string;
  perfil: PerfilGarcomLoja;
  mesas: MesaGarcom[];
  categorias: StoreCategoria[];
  produtosPorCat: Record<string, StoreProduto[]>;
  combosPorCat: Record<string, StoreCombo[]>;
}) {
  return (
    <StoreThemeProvider brown={perfil.temaCorMenu}>
      <GarcomAppInterno lojaId={lojaId} slug={slug} garcomNome={garcomNome} perfil={perfil} mesas={mesas} categorias={categorias} produtosPorCat={produtosPorCat} combosPorCat={combosPorCat} />
    </StoreThemeProvider>
  );
}

function fieldClass() {
  return "w-full rounded-xl border-[1.5px] border-neutral-200 bg-neutral-50 px-3.5 py-3 text-base text-neutral-900 outline-none transition-colors focus:bg-white";
}

function GarcomAppInterno({
  lojaId,
  slug,
  garcomNome,
  perfil,
  mesas,
  categorias,
  produtosPorCat,
  combosPorCat,
}: {
  lojaId: number;
  slug: string;
  garcomNome: string;
  perfil: PerfilGarcomLoja;
  mesas: MesaGarcom[];
  categorias: StoreCategoria[];
  produtosPorCat: Record<string, StoreProduto[]>;
  combosPorCat: Record<string, StoreCombo[]>;
}) {
  const router = useRouter();
  const { brown } = useStoreTheme();
  const [navView, setNavView] = useState<"pedir" | "abertos">("pedir");
  const [etapa, setEtapa] = useState<Etapa>("mesas");
  const [mesa, setMesa] = useState<MesaGarcom | null>(null);
  const [carrinho, setCarrinho] = useState<StoreCartItem[]>([]);
  const [produtoAtivo, setProdutoAtivo] = useState<StoreProduto | null>(null);
  const [comboAtivo, setComboAtivo] = useState<StoreCombo | null>(null);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [trocoPrecisa, setTrocoPrecisa] = useState<boolean | null>(null);
  const [trocoValor, setTrocoValor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [confirmacao, setConfirmacao] = useState<{ mesaNome: string; total: number } | null>(null);

  const [pedidosAbertos, setPedidosAbertos] = useState<PedidoAbertoGarcom[] | null>(null);
  const carregandoAbertosRef = useRef(false);

  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const carregarAbertos = () => {
    if (carregandoAbertosRef.current) return;
    carregandoAbertosRef.current = true;
    fetch("/api/waitermode/garcom-pedidos-abertos")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setPedidosAbertos(data.pedidos);
      })
      .catch(() => {})
      .finally(() => {
        carregandoAbertosRef.current = false;
      });
  };

  useEffect(() => {
    if (navView !== "abertos") return;
    carregarAbertos();
    const t = setInterval(carregarAbertos, 15000);
    return () => clearInterval(t);
  }, [navView]);

  const consumoCarrinho = consumoDoCarrinho(carrinho);

  function escolherMesa(m: MesaGarcom) {
    setMesa(m);
    setCarrinho([]);
    setFormaPagamento("");
    setTrocoPrecisa(null);
    setTrocoValor("");
    setEtapa("cardapio");
  }

  function trocarMesa() {
    if (carrinho.length > 0 && !window.confirm("Voltar agora descarta os itens ainda não enviados dessa mesa. Continuar?")) return;
    setMesa(null);
    setCarrinho([]);
    setEtapa("mesas");
  }

  function adicionarAoCarrinho(item: Omit<StoreCartItem, "key">) {
    setCarrinho((atual) => {
      if (item.tipo !== "combo") {
        const idx = atual.findIndex((i) => i.tipo !== "combo" && i.id === item.id && i.obs === item.obs);
        if (idx >= 0) return atual.map((i, ix) => (ix === idx ? { ...i, qtd: i.qtd + item.qtd } : i));
      }
      return [...atual, { ...item, key: `${Date.now()}_${Math.random().toString(36).slice(2)}` }];
    });
  }

  function alterarQtd(key: string, delta: number) {
    setCarrinho((atual) => atual.flatMap((i) => (i.key === key ? (i.qtd + delta <= 0 ? [] : [{ ...i, qtd: i.qtd + delta }]) : [i])));
  }

  const subtotalCarrinho = carrinho.reduce((s, i) => s + i.precoUnit * i.qtd, 0);
  const qtdCarrinho = carrinho.reduce((s, i) => s + i.qtd, 0);
  /* mesmo calculo do servidor (arredondado igual) — so pra exibir; quem manda
     na cobrança de verdade e o criarPedidoMesa, que recalcula a partir da
     config da loja e ignora qualquer valor vindo daqui. */
  const taxaServicoValor = perfil.taxaServicoAtiva ? Math.round(subtotalCarrinho * (perfil.taxaServicoPct / 100) * 100) / 100 : 0;
  const totalCarrinho = subtotalCarrinho + taxaServicoValor;

  const trocoValorNumerico = parseValorMascarado(trocoValor);
  const trocoValido = trocoValor.trim() === "" || (!isNaN(trocoValorNumerico) && trocoValorNumerico > totalCarrinho);

  async function enviarPedido() {
    if (!mesa || carrinho.length === 0 || !formaPagamento) return;
    setEnviando(true);
    setErroEnvio("");
    try {
      const res = await fetch("/api/waitermode/garcom-pedido-criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mesa_id: mesa.id,
          itens: carrinho.map((i) => ({ id: i.id, nome: i.nome, preco: i.precoUnit, qtd: i.qtd, obs: i.obs, combosels: i.combosels })),
          forma_pagamento: formaPagamento,
          troco_solicitado: formaPagamento === "dinheiro" && trocoPrecisa === true && trocoValorNumerico > 0,
          troco_valor: trocoValorNumerico || 0,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCartSheetOpen(false);
        setConfirmacao({ mesaNome: mesa.nome, total: totalCarrinho });
        setCarrinho([]);
        setFormaPagamento("");
        setTrocoPrecisa(null);
        setTrocoValor("");
      } else {
        setErroEnvio(data.msg ?? "Erro ao enviar o pedido.");
      }
    } catch {
      setErroEnvio("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  function fecharConfirmacao() {
    setConfirmacao(null);
    setMesa(null);
    setEtapa("mesas");
  }

  async function sair() {
    await fetch("/api/waitermode/garcom-logout", { method: "POST" }).catch(() => {});
    router.push(`/${slug}/garcom_login`);
    router.refresh();
  }

  const categoriasComItens = categorias.filter((c) => (produtosPorCat[c.id]?.length ?? 0) > 0 || (combosPorCat[c.id]?.length ?? 0) > 0);

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      {/* topo */}
      <div className="flex shrink-0 items-center gap-3 border-b border-neutral-100 px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-sm font-bold text-neutral-500">
          {perfil.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perfil.logoUrl} alt="" className="size-full object-cover" />
          ) : (
            perfil.nomeLoja.charAt(0)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[.9rem] font-semibold text-neutral-900">{perfil.nomeLoja}</p>
          <p className="truncate text-[.76rem] text-neutral-500">Garçom: {garcomNome}</p>
        </div>
        {etapa === "cardapio" && mesa && (
          <button type="button" onClick={trocarMesa} className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-[.78rem] font-semibold text-neutral-700">
            <ArrowLeftRight size={13} />
            {mesa.nome}
          </button>
        )}
        <button type="button" onClick={sair} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
          <LogOut size={15} />
        </button>
      </div>

      {/* abas */}
      <div className="flex shrink-0 border-b border-neutral-100">
        <button
          type="button"
          onClick={() => setNavView("pedir")}
          className="flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-[.82rem] font-semibold"
          style={navView === "pedir" ? { borderColor: brown, color: brown } : { borderColor: "transparent", color: "#6b7280" }}
        >
          <Plus size={15} />
          Novo pedido
        </button>
        <button
          type="button"
          onClick={() => setNavView("abertos")}
          className="flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-[.82rem] font-semibold"
          style={navView === "abertos" ? { borderColor: brown, color: brown } : { borderColor: "transparent", color: "#6b7280" }}
        >
          <ReceiptText size={15} />
          Pedidos abertos
          {pedidosAbertos && pedidosAbertos.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full text-[.68rem] font-bold text-white" style={{ background: brown }}>
              {pedidosAbertos.length}
            </span>
          )}
        </button>
      </div>

      {navView === "abertos" ? (
        <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
          {pedidosAbertos === null ? (
            <p className="py-10 text-center text-[.84rem] text-neutral-400">Carregando pedidos...</p>
          ) : pedidosAbertos.length === 0 ? (
            <p className="py-10 text-center text-[.84rem] text-neutral-400">Nenhum pedido em aberto no momento.</p>
          ) : (
            pedidosAbertos.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[.82rem] font-semibold text-neutral-900">
                    {p.mesaNome ?? "—"} · Pedido #{p.codigo}
                  </p>
                  <p className="truncate text-[.76rem] text-neutral-500">{p.itensResumo}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[.86rem] font-bold text-neutral-900">{formatarPreco(p.total)}</p>
                  <span className="text-[.7rem] font-semibold" style={{ color: brown }}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : etapa === "mesas" ? (
        <div className="flex-1 overflow-y-auto p-5">
          <h1 className="mb-4 text-[1.05rem] font-bold text-neutral-900">Qual mesa você está atendendo?</h1>
          {mesas.length === 0 ? (
            <p className="rounded-xl bg-neutral-50 p-4 text-[.84rem] text-neutral-500">
              Nenhuma mesa cadastrada. Peça ao gerente para cadastrar mesas em Modo Garçom.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {mesas.map((m) => (
                <button key={m.id} type="button" onClick={() => escolherMesa(m)} className="rounded-xl border-[1.5px] border-neutral-200 p-4 text-center font-semibold text-neutral-700 transition-colors hover:border-neutral-300">
                  {m.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex-1 overflow-y-auto pb-24">
          {categoriasComItens.length === 0 ? (
            <p className="p-5 text-center text-[.84rem] text-neutral-500">Nenhum produto disponível no momento.</p>
          ) : (
            <>
              <nav className="sticky top-0 z-10 border-b border-neutral-100 bg-white/95 backdrop-blur">
                <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-2.5">
                  {categoriasComItens.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => sectionRefs.current[c.id]?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="shrink-0 rounded-full border border-neutral-200 px-3.5 py-1.5 text-[.78rem] font-semibold whitespace-nowrap text-neutral-700"
                    >
                      {c.nome}
                    </button>
                  ))}
                </div>
              </nav>

              {categoriasComItens.map((cat) => {
                const combos = combosPorCat[cat.id] ?? [];
                const produtos = produtosPorCat[cat.id] ?? [];
                return (
                  <div
                    key={cat.id}
                    ref={(el) => {
                      sectionRefs.current[cat.id] = el;
                    }}
                  >
                    <h2 className="px-4 pt-3.5 pb-1 text-[.95rem] font-bold text-neutral-900">{cat.nome}</h2>
                    <div>
                      {combos.map((combo) => (
                        <button
                          key={`combo-${combo.id}`}
                          type="button"
                          onClick={() => setComboAtivo(combo)}
                          className="mx-3 mb-2 flex w-[calc(100%-24px)] items-center gap-3 rounded-xl border border-neutral-100 p-3.5 text-left transition-shadow hover:border-neutral-200 hover:shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-1.5">
                              <span className="text-[.88rem] font-semibold text-neutral-900">{combo.nome}</span>
                              <span className="rounded bg-amber-500 px-1.5 py-px text-[.6rem] font-bold tracking-wide text-white uppercase">Combo</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {combo.em_promo && <span className="text-[.72rem] text-neutral-400 line-through">{formatarPreco(combo.preco_base)}</span>}
                              <span className="text-[.88rem] font-bold" style={{ color: brown }}>
                                {formatarPreco(combo.preco_final)}
                              </span>
                            </div>
                          </div>
                          <div className="size-[72px] shrink-0 overflow-hidden rounded-[10px] bg-neutral-100">
                            {combo.imagem ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={combo.imagem} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="flex size-full items-center justify-center text-neutral-300">
                                <ImageIcon size={22} />
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                      {produtos.map((produto) => {
                        const restante = produto.estoque - (consumoCarrinho[produto.id] ?? 0);
                        const esgotado = produto.esgotado || restante <= 0;
                        return (
                          <button
                            key={`produto-${produto.id}`}
                            type="button"
                            onClick={() => setProdutoAtivo(produto)}
                            className={`mx-3 mb-2 flex w-[calc(100%-24px)] items-center gap-3 rounded-xl border border-neutral-100 p-3.5 text-left transition-shadow hover:border-neutral-200 hover:shadow-sm ${esgotado ? "opacity-65" : ""}`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="mb-0.5 text-[.88rem] font-semibold text-neutral-900">{produto.nome}</div>
                              <div className="flex items-center gap-1.5">
                                {produto.em_promo && <span className="text-[.72rem] text-neutral-400 line-through">{formatarPreco(produto.preco_base)}</span>}
                                <span className="text-[.88rem] font-bold" style={{ color: brown }}>
                                  {produto.tem_variacoes === 1 && !produto.em_promo ? "a partir de " : ""}
                                  {formatarPreco(produto.preco_final)}
                                </span>
                              </div>
                            </div>
                            <div className="relative size-[72px] shrink-0 overflow-hidden rounded-[10px] bg-neutral-100">
                              {produto.imagem ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={produto.imagem} alt="" className="size-full object-cover" />
                              ) : (
                                <div className="flex size-full items-center justify-center text-neutral-300">
                                  <ImageIcon size={22} />
                                </div>
                              )}
                            </div>
                            {esgotado && (
                              <span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-red-600 px-2 py-0.5 text-[.6rem] font-bold tracking-wide text-white uppercase">Esgotado</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {qtdCarrinho > 0 && (
            <button
              type="button"
              onClick={() => setCartSheetOpen(true)}
              className="fixed inset-x-4 bottom-4 z-20 flex items-center justify-between rounded-xl px-4 py-3.5 text-white shadow-lg"
              style={{ background: brown }}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-white/25 text-[.78rem] font-bold">{qtdCarrinho}</span>
              <span className="text-[.86rem] font-semibold">Ver pedido da mesa</span>
              <span className="text-[.86rem] font-bold">{formatarPreco(totalCarrinho)}</span>
            </button>
          )}
        </div>
      )}

      <StoreProdutoDialog produto={produtoAtivo} lojaId={lojaId} jaNoCarrinho={produtoAtivo ? (consumoCarrinho[produtoAtivo.id] ?? 0) : 0} open={produtoAtivo !== null} onOpenChange={(v) => !v && setProdutoAtivo(null)} onAdicionar={adicionarAoCarrinho} />
      <StoreComboDialog combo={comboAtivo} lojaId={lojaId} consumoCarrinho={consumoCarrinho} open={comboAtivo !== null} onOpenChange={(v) => !v && setComboAtivo(null)} onAdicionar={adicionarAoCarrinho} />

      <StoreSheet
        open={cartSheetOpen}
        onOpenChange={setCartSheetOpen}
        onBack={() => setCartSheetOpen(false)}
        title="Pedido da mesa"
        footer={
          carrinho.length > 0 ? (
            <>
              {taxaServicoValor > 0 && (
                <div className="mb-1 flex items-center justify-between text-[.78rem] text-neutral-500">
                  <span>Subtotal</span>
                  <span>{formatarPreco(subtotalCarrinho)}</span>
                </div>
              )}
              {taxaServicoValor > 0 && (
                <div className="mb-1 flex items-center justify-between text-[.78rem] text-neutral-500">
                  <span>Taxa de serviço ({perfil.taxaServicoPct}%)</span>
                  <span>{formatarPreco(taxaServicoValor)}</span>
                </div>
              )}
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[.78rem] text-neutral-500">Total do pedido</span>
                <span className="text-[.9rem] font-bold text-neutral-900">{formatarPreco(totalCarrinho)}</span>
              </div>
              <button
                type="button"
                disabled={!formaPagamento || enviando || (formaPagamento === "dinheiro" && trocoPrecisa === true && !trocoValido)}
                onClick={enviarPedido}
                className="w-full rounded-[10px] py-3.5 text-[.9rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
                style={{ background: !formaPagamento || enviando ? "#c0a88a" : brown }}
              >
                {enviando ? "Enviando..." : "Enviar pedido"}
              </button>
            </>
          ) : undefined
        }
      >
        <div className="space-y-3 px-4 py-4">
          {carrinho.length === 0 ? (
            <p className="py-10 text-center text-[.84rem] text-neutral-400">Nenhum item</p>
          ) : (
            carrinho.map((item) => (
              <div key={item.key} className="flex items-start gap-3 border-b border-neutral-100 pb-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {item.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imagem} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-neutral-300">
                      <ImageIcon size={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[.86rem] font-semibold text-neutral-900">{item.nome}</p>
                  <p className="text-[.82rem] font-bold text-neutral-900">{formatarPreco(item.precoUnit * item.qtd)}</p>
                  {item.combosels && item.combosels.length > 0 && (
                    <p className="text-[.74rem] text-neutral-500">{item.combosels.map((s) => `${s.qtd}x ${s.nome}`).join(", ")}</p>
                  )}
                  {item.obs && <p className="text-[.74rem] text-neutral-500">{item.obs}</p>}
                </div>
                <QtyStepper value={item.qtd} onChange={(qtd) => alterarQtd(item.key, qtd - item.qtd)} min={0} />
              </div>
            ))
          )}

          {carrinho.length > 0 && (
            <div className="pt-1">
              <p className="mb-2.5 text-[.84rem] font-semibold text-neutral-900">Forma de pagamento</p>
              <div className="space-y-2">
                {[
                  { valor: "pix", label: "Pix", ativo: perfil.pixAtivo },
                  { valor: "dinheiro", label: "Dinheiro", ativo: perfil.dinAtivo },
                  { valor: "credito", label: "Cartão de crédito", ativo: perfil.credAtivo },
                  { valor: "debito", label: "Cartão de débito", ativo: perfil.debAtivo },
                ]
                  .filter((f) => f.ativo)
                  .map((f) => (
                    <label
                      key={f.valor}
                      onClick={() => {
                        setFormaPagamento(f.valor);
                        setTrocoPrecisa(null);
                        setTrocoValor("");
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] p-3 transition-colors"
                      style={formaPagamento === f.valor ? { borderColor: brown, background: `${brown}0d` } : { borderColor: "#e5e7eb" }}
                    >
                      <span className="flex-1 text-[.86rem] font-semibold text-neutral-900">{f.label}</span>
                      <span
                        className="flex size-[20px] shrink-0 items-center justify-center rounded-full border-2"
                        style={formaPagamento === f.valor ? { borderColor: brown, background: brown } : { borderColor: "#ddd" }}
                      >
                        {formaPagamento === f.valor && <span className="size-2 rounded-full bg-white" />}
                      </span>
                      <input type="radio" name="pagamento" checked={formaPagamento === f.valor} onChange={() => {}} className="sr-only" />
                    </label>
                  ))}
              </div>

              {formaPagamento === "dinheiro" && (
                <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
                  <p className="mb-2 text-[.8rem] font-semibold text-neutral-800">Precisa de troco?</p>
                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTrocoPrecisa(true)}
                      className="flex-1 rounded-lg border-[1.5px] py-2 text-[.82rem] font-semibold"
                      style={trocoPrecisa === true ? { borderColor: "#86efac", background: "#f0fdf4", color: "#16a34a" } : { borderColor: "#e5e7eb", color: "#111" }}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTrocoPrecisa(false);
                        setTrocoValor("");
                      }}
                      className="flex-1 rounded-lg border-[1.5px] py-2 text-[.82rem] font-semibold"
                      style={trocoPrecisa === false ? { borderColor: "#fed7aa", background: "#fff7ed", color: "#9a3412" } : { borderColor: "#e5e7eb", color: "#111" }}
                    >
                      Não
                    </button>
                  </div>
                  {trocoPrecisa === true && (
                    <>
                      <input value={trocoValor} onChange={(e) => setTrocoValor(maskValorDigitado(e.target.value))} inputMode="decimal" placeholder="Troco para quanto?" className={fieldClass()} />
                      {!trocoValido && (
                        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[.76rem] text-red-700">
                          <AlertCircle size={13} className="shrink-0" />O valor precisa ser maior que o total do pedido
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {erroEnvio && <p className="text-[.84rem] text-red-600">{erroEnvio}</p>}
        </div>
      </StoreSheet>

      {confirmacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full text-2xl text-white" style={{ background: brown }}>
              ✓
            </div>
            <p className="mb-1 text-[1rem] font-bold text-neutral-900">Pedido enviado para a cozinha!</p>
            <p className="mb-5 text-[.86rem] text-neutral-500">
              {confirmacao.mesaNome} · {formatarPreco(confirmacao.total)}
            </p>
            <button type="button" onClick={fecharConfirmacao} className="w-full rounded-[10px] py-3 text-[.88rem] font-bold text-white" style={{ background: brown }}>
              Novo pedido
            </button>
          </div>
        </div>
      )}

      {navView === "pedir" && etapa === "mesas" && mesas.length === 0 && (
        <div className="flex items-center gap-2 border-t border-neutral-100 bg-blue-50 px-4 py-2.5 text-[.78rem] text-blue-800">
          <Info size={14} className="shrink-0" />
          Fale com o gerente da loja para cadastrar as mesas.
        </div>
      )}
    </div>
  );
}
