"use client";

import { useEffect, useRef, useState } from "react";
import {
  AtSign,
  Clock3,
  Coins,
  Gift,
  ImageIcon,
  Layers,
  List,
  Percent,
  RefreshCw,
  Search,
  Share2,
  ShoppingBag,
  Star,
} from "lucide-react";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCatalogo, StoreCombo, StoreCupomResultado, StorePedidoSnapshot, StorePedidosClienteResposta, StorePerfil, StoreProduto } from "@/lib/store/types";
import { StoreThemeProvider, useStoreTheme } from "@/components/store/store-theme";
import { useStoreCart } from "@/components/store/use-store-cart";
import { StoreProdutoDialog } from "@/components/store/store-produto-dialog";
import { StoreComboDialog } from "@/components/store/store-combo-dialog";
import { StoreCartSheet } from "@/components/store/store-cart-sheet";
import { StoreCheckoutDialog } from "@/components/store/store-checkout-dialog";
import { StoreSuccessDialog } from "@/components/store/store-success-dialog";
import { StoreInfoDialog } from "@/components/store/store-info-dialog";
import { StoreAuthModal } from "@/components/store/store-auth-modal";
import { StorePedidosSheet } from "@/components/store/store-pedidos-sheet";
import { StorePontosSheet } from "@/components/store/store-pontos-sheet";
import { StorePromoListaModal } from "@/components/store/store-promo-lista-modal";

function isCombo(item: StoreProduto | StoreCombo): item is StoreCombo {
  return "tipo" in item && item.tipo === "combo";
}

export function StoreView({ perfil, catalogo }: { perfil: StorePerfil; catalogo: StoreCatalogo }) {
  return (
    <StoreThemeProvider brown={perfil.temaCorMenu}>
      <StoreViewInner perfil={perfil} catalogo={catalogo} />
    </StoreThemeProvider>
  );
}

function StoreViewInner({ perfil: perfilInicial, catalogo }: { perfil: StorePerfil; catalogo: StoreCatalogo }) {
  const { brown } = useStoreTheme();
  const [perfil, setPerfil] = useState(perfilInicial);
  const cart = useStoreCart(perfil.loja_id);

  const [produtoAberto, setProdutoAberto] = useState<StoreProduto | null>(null);
  const [comboAberto, setComboAberto] = useState<StoreCombo | null>(null);
  const [cartAberto, setCartAberto] = useState(false);
  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{ codigo: number | string; snapshot: StorePedidoSnapshot } | null>(null);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [infoAberto, setInfoAberto] = useState(false);
  const [cupomAplicado, setCupomAplicado] = useState<StoreCupomResultado | null>(null);
  const [promoListaAberta, setPromoListaAberta] = useState(false);
  const [authModalAberto, setAuthModalAberto] = useState(false);
  const [authTelefoneInicial, setAuthTelefoneInicial] = useState("");
  const [authDestino, setAuthDestino] = useState<"pedidos" | "pontos">("pedidos");
  const [pedidosSheetAberto, setPedidosSheetAberto] = useState(false);
  const [pedidosCliente, setPedidosCliente] = useState<StorePedidosClienteResposta["cliente"] | null>(null);
  const [pedidosResumo, setPedidosResumo] = useState<
    { id: number; tipo: string; forma_pagamento: string; total: number; criado_em: string }[]
  >([]);
  const [pontosSheetAberto, setPontosSheetAberto] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(catalogo.categorias[0]?.id ?? null);
  const [catalogoAtualizadoVisivel, setCatalogoAtualizadoVisivel] = useState(false);

  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const catNavRef = useRef<HTMLDivElement>(null);
  const catalogoVersaoRef = useRef(perfilInicial.catalogoVersao);
  const catalogoBannerMostradoRef = useRef(false);
  const interacaoRef = useRef(false);

  useEffect(() => {
    function onScroll() {
      const entries = Object.entries(sectionRefs.current);
      let closest: { id: number; top: number } | null = null;
      for (const [idStr, el] of entries) {
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= 140 && (closest === null || top > closest.top)) {
          closest = { id: Number(idStr), top };
        }
      }
      if (closest) setCategoriaAtiva(closest.id);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Snapshot pro polling ler sem precisar recriar o interval a cada
     mudanca de carrinho/modal aberto. */
  useEffect(() => {
    interacaoRef.current = cart.itens.length > 0 || produtoAberto !== null || comboAberto !== null || cartAberto || checkoutAberto || infoAberto;
  });

  /* Loja publica: horario/pausa/catalogo podem mudar no admin a qualquer
     momento enquanto o cliente esta navegando. Mesmo mecanismo do loja.js
     legado (_atualizarLojaStatus/_verificarNovaCatalogoVersao), 20s. */
  useEffect(() => {
    async function verificarStatus() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/store/loja-status?loja_id=${perfil.loja_id}`);
        const d = await res.json();
        if (!d.ok) return;
        setPerfil((p) => ({
          ...p,
          lojaAberta: d.aberto,
          entAtiva: d.entAtiva,
          retAtiva: d.retAtiva,
          pausaAtivaTitulo: d.pausaTitulo || "",
          pausaAtivaFim: d.pausaFim || "",
          proximoHorario: d.proximoHorario || "",
          semanaHorarios: Array.isArray(d.semana) ? d.semana : p.semanaHorarios,
        }));
        if (d.catalogoVersao && d.catalogoVersao !== catalogoVersaoRef.current) {
          catalogoVersaoRef.current = d.catalogoVersao;
          if (catalogoBannerMostradoRef.current) return;
          if (!interacaoRef.current) {
            window.location.reload();
            return;
          }
          catalogoBannerMostradoRef.current = true;
          setCatalogoAtualizadoVisivel(true);
        }
      } catch {
        // silencioso — polling nao pode travar a navegacao do cliente
      }
    }
    const id = setInterval(verificarStatus, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.loja_id]);

  function irParaCategoria(id: number) {
    setCategoriaAtiva(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function abrirItem(item: StoreProduto | StoreCombo) {
    if (isCombo(item)) setComboAberto(item);
    else setProdutoAberto(item);
  }

  function abrirPromoNav() {
    const itens = catalogo.produtosEmPromo;
    if (itens.length === 1) abrirItem(itens[0]);
    else setPromoListaAberta(true);
  }

  /* Popup automatico de promocao ao entrar na loja, so na primeira vez nessa
     sessao do navegador — mesma regra do loja.js legado. 2+ produtos em
     promocao abre a lista (chave de sessao inclui os ids, entao reaparece se
     o conjunto mudar); com so 1 mas com foto/descricao de propaganda
     configurada (promoAutoPopup), abre direto o produto. */
  useEffect(() => {
    if (catalogo.produtosEmPromo.length >= 2) {
      const idsOrdenados = catalogo.produtosEmPromo
        .map((p) => p.id)
        .sort((a, b) => a - b)
        .join("-");
      const chave = `promo_lista_visto_${perfil.loja_id}_${idsOrdenados}`;
      if (!sessionStorage.getItem(chave)) {
        sessionStorage.setItem(chave, "1");
        const t = setTimeout(() => setPromoListaAberta(true), 600);
        return () => clearTimeout(t);
      }
    } else if (catalogo.promoAutoPopup) {
      const chave = `promo_visto_${perfil.loja_id}_${catalogo.promoAutoPopup.id}`;
      if (!sessionStorage.getItem(chave)) {
        sessionStorage.setItem(chave, "1");
        const produto = catalogo.promoAutoPopup;
        const t = setTimeout(() => abrirItem(produto), 600);
        return () => clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSucessoPedido(codigo: number | string, snapshot: StorePedidoSnapshot) {
    cart.limpar();
    setCheckoutAberto(false);
    setPedidoConfirmado({ codigo, snapshot });
  }

  const termoBusca = busca.trim().toLowerCase();
  const categoriasFiltradas = termoBusca
    ? catalogo.categorias
        .map((cat) => ({
          cat,
          produtos: (catalogo.produtosPorCat[cat.id] ?? []).filter((p) => p.nome.toLowerCase().includes(termoBusca)),
          combos: (catalogo.combosPorCat[cat.id] ?? []).filter((c) => c.nome.toLowerCase().includes(termoBusca)),
        }))
        .filter((x) => x.produtos.length > 0 || x.combos.length > 0)
    : catalogo.categorias.map((cat) => ({
        cat,
        produtos: catalogo.produtosPorCat[cat.id] ?? [],
        combos: catalogo.combosPorCat[cat.id] ?? [],
      }));

  const instagramHandle = perfil.lojaInstagram.replace(/^@/, "");

  return (
    <div className="min-h-screen bg-white pb-[86px]" style={{ ["--store-pink" as string]: "#e63770" }}>
      {catalogoAtualizadoVisivel && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="fixed top-4 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-2.5 text-[.82rem] font-semibold whitespace-nowrap text-white shadow-lg"
          style={{ background: brown }}
        >
          <RefreshCw size={15} />
          Cardapio atualizado! Toque para ver as novidades.
        </button>
      )}
      {/* Banner */}
      <div className="relative mx-auto max-w-[901px]">
        <div className="h-[210px] w-full bg-neutral-100">
          {perfil.capaLoja ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perfil.capaLoja} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full" style={{ background: `linear-gradient(135deg, ${brown}, #a07050)` }} />
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.share) {
              navigator.share({ title: perfil.nomeLoja, url: window.location.href }).catch(() => {});
            } else if (typeof navigator !== "undefined") {
              navigator.clipboard?.writeText(window.location.href);
            }
          }}
          className="absolute top-3 right-3 flex size-[38px] items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-md"
        >
          <Share2 size={15} />
        </button>
      </div>

      {/* Header row */}
      <div className="relative mx-auto flex max-w-[901px] items-start justify-between px-4" style={{ marginTop: -34 }}>
        <div className="relative inline-flex shrink-0">
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-30"
            style={{ background: brown, animationDuration: "2.4s" }}
          />
          <button
            type="button"
            onClick={() => setInfoAberto(true)}
            className="relative inline-flex shrink-0 items-center justify-center rounded-full p-[3px]"
            style={{ background: "conic-gradient(from -90deg, #e8c9a0, #d9a66c, #f0d9b8, #e8c9a0)" }}
          >
            <div className="size-[88px] overflow-hidden rounded-full border-[3px] border-white bg-white shadow-md">
              {perfil.perfilLoja ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={perfil.perfilLoja} alt={perfil.nomeLoja} className="size-full object-cover" />
              ) : (
                <div
                  className="flex size-full items-center justify-center text-2xl font-extrabold text-white"
                  style={{ background: brown }}
                >
                  {perfil.nomeLoja.charAt(0)}
                </div>
              )}
            </div>
          </button>
        </div>
        <div className="flex flex-col items-end gap-1 pt-[52px]">
          {perfil.avaliacaoMedia > 0 && (
            <span className="flex items-center gap-1 text-[.82rem] font-bold text-neutral-900">
              <Star size={13} className="fill-amber-500 text-amber-500" />
              {perfil.avaliacaoMedia.toLocaleString("pt-BR")}
            </span>
          )}
          {instagramHandle && (
            <span className="flex items-center gap-1 text-[.78rem] text-neutral-600">
              <AtSign size={14} className="text-[#c13584]" />
              {instagramHandle}
            </span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="mx-auto max-w-[901px] px-4 pt-2.5">
        <div className="mb-0.5 flex items-center gap-1.5 text-[1.15rem] font-extrabold text-neutral-900">
          {perfil.nomeLoja}
          {perfil.lojaVerificada && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" className="shrink-0">
              <path d="M12 2l2.4 1.6 2.8-.6 1.4 2.5 2.5 1.4-.6 2.8L22 12l-1.6 2.4.6 2.8-2.5 1.4-1.4 2.5-2.8-.6L12 22l-2.4-1.6-2.8.6-1.4-2.5-2.5-1.4.6-2.8L2 12l1.6-2.4-.6-2.8 2.5-1.4 1.4-2.5 2.8.6z" />
              <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        {(perfil.lojaBairro || perfil.lojaCidade) && (
          <p className="mb-1 text-[.78rem] text-neutral-500">
            {[perfil.lojaCidade, perfil.lojaBairro].filter(Boolean).join(", ")}
          </p>
        )}
        <p className={`text-[.82rem] font-semibold ${perfil.lojaAberta ? "text-emerald-600" : ""}`} style={perfil.lojaAberta ? undefined : { color: "var(--store-pink)" }}>
          {perfil.lojaAberta ? "Aberto agora" : `Fechado${perfil.proximoHorario ? ` • abre ${perfil.proximoHorario}` : ""}`}
        </p>
      </div>

      {/* Chips */}
      {(perfil.entAtiva || (perfil.cashbackAtivo && perfil.cashbackPct > 0) || perfil.pedidoMinExibir > 0) && (
        <div className="mx-auto mt-3.5 flex max-w-[901px] gap-2 px-4">
          {perfil.entAtiva && (
            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5">
              <Clock3 size={16} style={{ color: brown }} className="shrink-0" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[.73rem] font-bold text-neutral-900">
                  {perfil.tEntMin}-{perfil.tEntMax} min
                </span>
                <span className="text-[.62rem] text-neutral-500">Entrega</span>
              </div>
            </div>
          )}
          {perfil.cashbackAtivo && perfil.cashbackPct > 0 && (
            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5">
              <Percent size={16} style={{ color: brown }} className="shrink-0" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[.73rem] font-bold text-neutral-900">{perfil.cashbackPct}%</span>
                <span className="text-[.62rem] text-neutral-500">Cashback</span>
              </div>
            </div>
          )}
          {perfil.pedidoMinExibir > 0 && (
            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5">
              <ShoppingBag size={16} style={{ color: brown }} className="shrink-0" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[.73rem] font-bold text-neutral-900">
                  {formatarPreco(perfil.pedidoMinExibir)}
                </span>
                <span className="text-[.62rem] text-neutral-500">Pedido min.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!perfil.lojaAberta && (
        <div className="mx-auto mt-3.5 max-w-[901px] px-4">
          <div className="flex items-start gap-2.5 border-l-[3px] border-amber-300 bg-amber-50 px-4 py-3 text-[.8rem] text-amber-800">
            Loja fechada no momento{perfil.proximoHorario ? ` — abre ${perfil.proximoHorario}` : ""}.
          </div>
        </div>
      )}

      {/* Category nav */}
      <div ref={catNavRef} className="sticky top-0 z-30 mt-4 border-b border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-[901px] items-center px-2">
          <div className="flex flex-1 gap-1.5 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {catalogo.categorias.map((cat) => {
              const ativa = categoriaAtiva === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => irParaCategoria(cat.id)}
                  className="shrink-0 rounded-full px-4 py-1.5 text-[.8rem] font-semibold whitespace-nowrap transition-colors"
                  style={ativa ? { color: "#fff", background: brown } : { color: "#888" }}
                >
                  {cat.nome}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setBuscaAberta((v) => !v)}
            className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${buscaAberta ? "border-neutral-300 bg-neutral-100" : "border-neutral-200 bg-white"} text-neutral-600`}
          >
            <Search size={15} />
          </button>
        </div>
        {buscaAberta && (
          <div className="mx-auto max-w-[901px] px-3.5 pb-2">
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar no cardapio"
              className="w-full rounded-xl border-[1.5px] border-neutral-200 bg-neutral-50 px-3.5 py-2 text-base outline-none focus:bg-white"
              style={{ borderColor: undefined }}
            />
          </div>
        )}
      </div>

      {/* Destaques */}
      {!termoBusca && catalogo.destaques.length > 0 && (
        <div className="mx-auto max-w-[901px]">
          <h2 className="px-4 pt-4 pb-2 text-[.95rem] font-bold text-neutral-900">Destaques</h2>
          <div className="flex gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {catalogo.destaques.map((item) => (
              <button
                key={`${isCombo(item) ? "combo" : "produto"}-${item.id}`}
                type="button"
                onClick={() => abrirItem(item)}
                className="w-[140px] shrink-0 cursor-pointer text-left"
              >
                <div className="mb-1.5 h-[110px] w-[140px] overflow-hidden rounded-xl bg-neutral-100">
                  {item.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imagem} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-neutral-300">
                      {isCombo(item) ? <Layers size={26} /> : <ImageIcon size={26} />}
                    </div>
                  )}
                </div>
                {(item.em_promo || isCombo(item)) && (
                  <div className="mb-0.5 flex gap-1">
                    {isCombo(item) && (
                      <span className="rounded bg-amber-500 px-1.5 py-px text-[.62rem] font-bold tracking-wide text-white uppercase">
                        Combo
                      </span>
                    )}
                    {item.em_promo && (
                      <span className="rounded bg-emerald-600 px-1.5 py-px text-[.62rem] font-bold text-white">Promo</span>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[.9rem] font-bold ${item.em_promo ? "text-emerald-600" : "text-neutral-900"}`}>
                    {formatarPreco(item.preco_final)}
                  </span>
                  {item.em_promo && (
                    <>
                      <span className="text-[.72rem] text-neutral-400 line-through">{formatarPreco(item.preco_base)}</span>
                      <span className="rounded bg-emerald-600 px-1.5 py-px text-[.62rem] font-bold text-white">-{item.desc_pct}%</span>
                    </>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[.78rem] text-neutral-600">{item.nome}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categorias / produtos */}
      <div className="mx-auto max-w-[901px]">
        {categoriasFiltradas.map(({ cat, produtos, combos }) => {
          if (produtos.length === 0 && combos.length === 0) return null;
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
                    onClick={() => abrirItem(combo)}
                    className="mx-3 mb-2 flex w-[calc(100%-24px)] items-center gap-3 rounded-xl border border-neutral-100 p-3.5 text-left transition-shadow hover:border-neutral-200 hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <span className="text-[.88rem] font-semibold text-neutral-900">{combo.nome}</span>
                        <span className="rounded bg-amber-500 px-1.5 py-px text-[.6rem] font-bold tracking-wide text-white uppercase">
                          Combo
                        </span>
                      </div>
                      {combo.descricao && (
                        <p className="mb-1.5 line-clamp-2 text-[.76rem] leading-snug text-neutral-500">{combo.descricao}</p>
                      )}
                      <div className="flex items-center gap-1.5">
                        {combo.em_promo && (
                          <span className="text-[.72rem] text-neutral-400 line-through">{formatarPreco(combo.preco_base)}</span>
                        )}
                        <span className="text-[.88rem] font-bold" style={{ color: brown }}>
                          {formatarPreco(combo.preco_final)}
                        </span>
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <div className="size-[88px] overflow-hidden rounded-[10px] bg-neutral-100">
                        {combo.imagem ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={combo.imagem} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-neutral-300">
                            <Layers size={26} />
                          </div>
                        )}
                      </div>
                      <span
                        className="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-full border-2 border-white text-white shadow-md"
                        style={{ background: brown }}
                      >
                        +
                      </span>
                    </div>
                  </button>
                ))}
                {produtos.map((produto) => (
                  <button
                    key={`produto-${produto.id}`}
                    type="button"
                    onClick={() => abrirItem(produto)}
                    className={`mx-3 mb-2 flex w-[calc(100%-24px)] items-center gap-3 rounded-xl border border-neutral-100 p-3.5 text-left transition-shadow hover:border-neutral-200 hover:shadow-sm ${produto.esgotado ? "opacity-65" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 text-[.88rem] font-semibold text-neutral-900">{produto.nome}</div>
                      {produto.descricao && (
                        <p className="mb-1.5 line-clamp-2 text-[.76rem] leading-snug text-neutral-500">{produto.descricao}</p>
                      )}
                      <div className="flex items-center gap-1.5">
                        {produto.em_promo && (
                          <span className="text-[.72rem] text-neutral-400 line-through">
                            {formatarPreco(produto.preco_base)}
                          </span>
                        )}
                        <span className="text-[.88rem] font-bold" style={{ color: brown }}>
                          {produto.tem_variacoes === 1 && !produto.em_promo ? "a partir de " : ""}
                          {formatarPreco(produto.preco_final)}
                        </span>
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <div className="size-[88px] overflow-hidden rounded-[10px] bg-neutral-100">
                        {produto.imagem ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={produto.imagem} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-neutral-300">
                            <ImageIcon size={26} />
                          </div>
                        )}
                      </div>
                      {produto.esgotado ? (
                        <span className="absolute -right-1.5 -bottom-1.5 rounded-full border-2 border-white bg-red-600 px-2.5 py-[5px] text-[.6rem] font-bold tracking-wide text-white uppercase whitespace-nowrap">
                          Esgotado
                        </span>
                      ) : (
                        <span
                          className="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-full border-2 border-white text-white shadow-md"
                          style={{ background: brown }}
                        >
                          +
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {termoBusca && categoriasFiltradas.length === 0 && (
          <p className="px-4 py-10 text-center text-[.86rem] text-neutral-400">Nenhum item encontrado.</p>
        )}
      </div>

      {/* Rodape */}
      <div className="mx-auto max-w-[901px] border-t border-neutral-100 px-5 py-6 text-center">
        <p className="mb-3 text-[.8rem] leading-relaxed text-neutral-500">
          Tem um negocio e precisa de um cardapio digital simples e facil? O <strong className="font-semibold text-neutral-700">Lilly</strong> e a solucao.
        </p>
        <a
          href="https://lillymenu.com/public/home"
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-full border-[1.5px] px-5 py-1.5 text-[.8rem] font-semibold transition-colors"
          style={{ borderColor: "var(--store-pink)", color: "var(--store-pink)" }}
        >
          Saiba mais
        </a>
      </div>

      {/* Cart bar */}
      {cart.totalItens > 0 && (
        <div className="fixed inset-x-0 bottom-[60px] z-40 flex justify-center border-t border-neutral-100 bg-white px-4 py-2.5">
          <div className="flex w-full max-w-[901px] items-center justify-between gap-3">
            <div>
              <p className="text-[.72rem] text-neutral-500">Subtotal</p>
              <p className="flex items-baseline gap-1 text-[.9rem] font-bold text-neutral-900">
                {formatarPreco(cart.subtotal)}
                <span className="text-[.72rem] font-normal text-neutral-500">{cart.totalItens} itens</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCartAberto(true)}
              className="shrink-0 rounded-[10px] px-5 py-2.5 text-[.86rem] font-bold text-white"
              style={{ background: brown }}
            >
              Ver carrinho
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center border-t border-neutral-200 bg-white shadow-[0_-6px_20px_rgba(0,0,0,.07)]">
        <div className="flex w-full max-w-[901px]">
          <button type="button" className="flex flex-1 flex-col items-center gap-0.5 py-2 pb-2.5 text-[.62rem] font-bold tracking-wide" style={{ color: brown }}>
            <List size={20} />
            Menu
          </button>
          {perfil.clubePontosAtivo && (
            <button
              type="button"
              onClick={() => {
                setAuthDestino("pontos");
                setAuthModalAberto(true);
              }}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 pb-2.5 text-[.62rem] font-bold tracking-wide ${
                (authModalAberto && authDestino === "pontos") || pontosSheetAberto ? "" : "text-neutral-400"
              }`}
              style={(authModalAberto && authDestino === "pontos") || pontosSheetAberto ? { color: brown } : undefined}
            >
              <Coins size={20} />
              Pontos
            </button>
          )}
          <button
            type="button"
            onClick={abrirPromoNav}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 pb-2.5 text-[.62rem] font-bold tracking-wide ${promoListaAberta ? "" : "text-neutral-400"}`}
            style={promoListaAberta ? { color: brown } : undefined}
          >
            <Gift size={20} />
            Promo
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthDestino("pedidos");
              setAuthModalAberto(true);
            }}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 pb-2.5 text-[.62rem] font-bold tracking-wide ${
              (authModalAberto && authDestino === "pedidos") || pedidosSheetAberto ? "" : "text-neutral-400"
            }`}
            style={(authModalAberto && authDestino === "pedidos") || pedidosSheetAberto ? { color: brown } : undefined}
          >
            <ShoppingBag size={20} />
            Pedidos
          </button>
        </div>
      </div>

      <StoreProdutoDialog
        produto={produtoAberto}
        lojaId={perfil.loja_id}
        open={produtoAberto !== null}
        onOpenChange={(v) => !v && setProdutoAberto(null)}
        onAdicionar={cart.adicionar}
      />

      <StoreComboDialog
        combo={comboAberto}
        lojaId={perfil.loja_id}
        open={comboAberto !== null}
        onOpenChange={(v) => !v && setComboAberto(null)}
        onAdicionar={cart.adicionar}
      />

      <StoreCartSheet
        open={cartAberto}
        onOpenChange={setCartAberto}
        perfil={perfil}
        nomeLoja={perfil.nomeLoja}
        logoLoja={perfil.perfilLoja}
        itens={cart.itens}
        subtotal={cart.subtotal}
        onAtualizarQtd={cart.atualizarQtd}
        onRemover={cart.remover}
        onAdicionar={cart.adicionar}
        cupomAplicado={cupomAplicado}
        onCupomAplicadoChange={setCupomAplicado}
        onFinalizar={() => {
          setCartAberto(false);
          setCheckoutAberto(true);
        }}
      />

      <StoreCheckoutDialog
        open={checkoutAberto}
        onOpenChange={setCheckoutAberto}
        perfil={perfil}
        itens={cart.itens}
        subtotal={cart.subtotal}
        cupomAplicado={cupomAplicado}
        onCupomAplicadoChange={setCupomAplicado}
        onSucesso={onSucessoPedido}
        onVoltarCarrinho={() => {
          setCheckoutAberto(false);
          setCartAberto(true);
        }}
      />

      <StoreSuccessDialog
        open={pedidoConfirmado !== null}
        onOpenChange={(v) => !v && setPedidoConfirmado(null)}
        codigo={pedidoConfirmado?.codigo ?? ""}
        perfil={perfil}
        snapshot={pedidoConfirmado?.snapshot ?? null}
        onAcompanhar={() => {
          setAuthTelefoneInicial(pedidoConfirmado?.snapshot.telefone ?? "");
          setPedidoConfirmado(null);
          setAuthDestino("pedidos");
          setAuthModalAberto(true);
        }}
      />

      <StoreInfoDialog open={infoAberto} onOpenChange={setInfoAberto} perfil={perfil} />

      <StoreAuthModal
        open={authModalAberto}
        onOpenChange={setAuthModalAberto}
        lojaId={perfil.loja_id}
        destino={authDestino}
        telefoneInicial={authTelefoneInicial}
        onAutenticado={(dados) => {
          setPedidosCliente(dados.cliente ?? null);
          setPedidosResumo(
            (dados.pedidos ?? []).slice(0, 5).map((p) => ({
              id: p.id,
              tipo: p.tipo,
              forma_pagamento: p.forma_pagamento,
              total: Number(p.total),
              criado_em: p.criado_em,
            }))
          );
          setAuthModalAberto(false);
          if (authDestino === "pontos") setPontosSheetAberto(true);
          else setPedidosSheetAberto(true);
        }}
      />

      <StorePedidosSheet
        open={pedidosSheetAberto}
        onOpenChange={setPedidosSheetAberto}
        perfil={perfil}
        cliente={pedidosCliente}
        pedidosResumo={pedidosResumo}
      />

      <StorePontosSheet
        open={pontosSheetAberto}
        onOpenChange={setPontosSheetAberto}
        lojaId={perfil.loja_id}
        clienteId={pedidosCliente?.id ?? null}
        clienteNome={pedidosCliente?.nome ?? ""}
        saldoInicial={pedidosCliente?.saldo ?? 0}
        itensCarrinho={cart.itens}
        onVerHistorico={() => {
          setPontosSheetAberto(false);
          setPedidosSheetAberto(true);
        }}
        onResgatar={cart.adicionar}
      />

      <StorePromoListaModal
        open={promoListaAberta}
        onOpenChange={setPromoListaAberta}
        produtos={catalogo.produtosEmPromo}
        onSelecionar={(produto) => {
          setPromoListaAberta(false);
          abrirItem(produto);
        }}
      />
    </div>
  );
}
