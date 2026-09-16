"use client";

import { useState } from "react";
import { ImageIcon, Layers, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCatalogo, StoreCombo, StorePerfil, StoreProduto } from "@/lib/store/types";
import { useStoreCart } from "@/components/store/use-store-cart";
import { StoreProdutoDialog } from "@/components/store/store-produto-dialog";
import { StoreComboDialog } from "@/components/store/store-combo-dialog";
import { StoreCartSheet } from "@/components/store/store-cart-sheet";
import { StoreCheckoutDialog } from "@/components/store/store-checkout-dialog";

function isCombo(item: StoreProduto | StoreCombo): item is StoreCombo {
  return "tipo" in item && item.tipo === "combo";
}

export function StoreView({ perfil, catalogo }: { perfil: StorePerfil; catalogo: StoreCatalogo }) {
  const cart = useStoreCart(perfil.loja_id);

  const [produtoAberto, setProdutoAberto] = useState<StoreProduto | null>(null);
  const [comboAberto, setComboAberto] = useState<StoreCombo | null>(null);
  const [cartAberto, setCartAberto] = useState(false);
  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<number | string | null>(null);

  function abrirItem(item: StoreProduto | StoreCombo) {
    if (isCombo(item)) setComboAberto(item);
    else setProdutoAberto(item);
  }

  function onSucessoPedido(codigo: number | string) {
    cart.limpar();
    setCheckoutAberto(false);
    setPedidoConfirmado(codigo);
  }

  const semAgendamento = !perfil.lojaAberta;

  return (
    <div className="min-h-screen bg-[#f7f5f2] pb-24">
      <div className="h-40 w-full bg-muted sm:h-52">
        {perfil.capaLoja ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={perfil.capaLoja} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon size={28} />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-2xl px-4">
        <div className="-mt-8 flex items-end gap-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-full border-4 border-[#f7f5f2] bg-white shadow-sm">
            {perfil.perfilLoja ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.perfilLoja} alt={perfil.nomeLoja} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-lg font-bold text-muted-foreground">
                {perfil.nomeLoja.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="truncate text-lg font-semibold text-neutral-900">{perfil.nomeLoja}</h1>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className={perfil.lojaAberta ? "text-emerald-600" : "text-destructive"}>
                {perfil.lojaAberta ? "Aberto agora" : `Fechado${perfil.proximoHorario ? ` • abre ${perfil.proximoHorario}` : ""}`}
              </span>
              {perfil.avaliacaoMedia > 0 && (
                <span className="flex items-center gap-0.5">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  {perfil.avaliacaoMedia.toLocaleString("pt-BR")}
                </span>
              )}
            </div>
          </div>
        </div>

        {perfil.descLoja && <p className="mt-3 text-sm text-neutral-600">{perfil.descLoja}</p>}

        {semAgendamento && (
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Loja fechada no momento{perfil.proximoHorario ? ` — abre ${perfil.proximoHorario}` : ""}.
          </div>
        )}

        {catalogo.destaques.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-neutral-900">Destaques</h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {catalogo.destaques.map((item) => (
                <button
                  key={`${isCombo(item) ? "combo" : "produto"}-${item.id}`}
                  type="button"
                  onClick={() => abrirItem(item)}
                  className="w-32 shrink-0 rounded-xl border border-border bg-white text-left shadow-sm"
                >
                  <div className="h-24 w-full overflow-hidden rounded-t-xl bg-muted">
                    {item.imagem ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imagem} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-medium text-neutral-900">{item.nome}</p>
                    <p className="text-xs text-neutral-500">{formatarPreco(item.preco_final)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-8">
          {catalogo.categorias.map((cat) => {
            const produtos = catalogo.produtosPorCat[cat.id] ?? [];
            const combos = catalogo.combosPorCat[cat.id] ?? [];
            if (produtos.length === 0 && combos.length === 0) return null;
            return (
              <div key={cat.id} id={`cat-${cat.id}`}>
                <h2 className="mb-3 text-base font-semibold text-neutral-900">{cat.nome}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {combos.map((combo) => (
                    <button
                      key={`combo-${combo.id}`}
                      type="button"
                      onClick={() => abrirItem(combo)}
                      className="overflow-hidden rounded-xl border border-border bg-white text-left shadow-sm"
                    >
                      <div className="relative h-28 w-full bg-muted">
                        {combo.imagem ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={combo.imagem} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <Layers size={22} />
                          </div>
                        )}
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                          Combo
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="truncate text-sm font-medium text-neutral-900">{combo.nome}</p>
                        <p className="mt-0.5 text-sm text-neutral-700">{formatarPreco(combo.preco_final)}</p>
                      </div>
                    </button>
                  ))}
                  {produtos.map((produto) => (
                    <button
                      key={`produto-${produto.id}`}
                      type="button"
                      onClick={() => abrirItem(produto)}
                      disabled={produto.esgotado}
                      className="overflow-hidden rounded-xl border border-border bg-white text-left shadow-sm disabled:opacity-60"
                    >
                      <div className="relative h-28 w-full bg-muted">
                        {produto.imagem ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={produto.imagem} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <ImageIcon size={22} />
                          </div>
                        )}
                        {produto.esgotado && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                            Esgotado
                          </span>
                        )}
                        {produto.em_promo && !produto.esgotado && (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-white">
                            -{produto.desc_pct}%
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="truncate text-sm font-medium text-neutral-900">{produto.nome}</p>
                        {produto.em_promo ? (
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="text-xs text-neutral-400 line-through">
                              {formatarPreco(produto.preco_base)}
                            </span>
                            <span className="text-sm text-neutral-700">{formatarPreco(produto.preco_final)}</span>
                          </div>
                        ) : (
                          <p className="mt-0.5 text-sm text-neutral-700">
                            {produto.tem_variacoes === 1 ? "a partir de " : ""}
                            {formatarPreco(produto.preco_final)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cart.totalItens > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
          <Button
            type="button"
            className="w-full max-w-md gap-2 shadow-lg"
            size="lg"
            onClick={() => setCartAberto(true)}
          >
            <ShoppingBag size={16} />
            Ver carrinho ({cart.totalItens}) — {formatarPreco(cart.subtotal)}
          </Button>
        </div>
      )}

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
        itens={cart.itens}
        subtotal={cart.subtotal}
        onAtualizarQtd={cart.atualizarQtd}
        onRemover={cart.remover}
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
        onSucesso={onSucessoPedido}
      />

      {pedidoConfirmado !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Star size={24} className="fill-current" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900">Pedido enviado!</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Pedido #{pedidoConfirmado} recebido. Acompanhe pelo WhatsApp.
            </p>
            <Button type="button" className="mt-4 w-full" onClick={() => setPedidoConfirmado(null)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
