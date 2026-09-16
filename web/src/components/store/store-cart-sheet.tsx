"use client";

import { ImageIcon, ShoppingBag } from "lucide-react";
import { StoreSheet } from "@/components/store/store-sheet";
import { QtyStepper } from "@/components/store/qty-stepper";
import { useStoreTheme } from "@/components/store/store-theme";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCartItem } from "@/lib/store/types";

export function StoreCartSheet({
  open,
  onOpenChange,
  nomeLoja,
  logoLoja,
  itens,
  subtotal,
  onAtualizarQtd,
  onRemover,
  onFinalizar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nomeLoja: string;
  logoLoja: string;
  itens: StoreCartItem[];
  subtotal: number;
  onAtualizarQtd: (key: string, qtd: number) => void;
  onRemover: (key: string) => void;
  onFinalizar: () => void;
}) {
  const { brown } = useStoreTheme();

  return (
    <StoreSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Meu carrinho"
      rightAction={
        itens.length > 0 ? (
          <button type="button" onClick={() => itens.forEach((i) => onRemover(i.key))} className="text-[.8rem] text-neutral-400">
            Limpar
          </button>
        ) : undefined
      }
      footer={
        itens.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[.72rem] text-neutral-500">Total da compra</p>
              <p className="text-[.98rem] font-bold text-neutral-900">
                {formatarPreco(subtotal)} <span className="text-[.72rem] font-normal text-neutral-500">/ {itens.length} itens</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onFinalizar}
              className="shrink-0 rounded-[10px] px-6 py-3 text-[.86rem] font-bold text-white"
              style={{ background: brown }}
            >
              Continuar
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
            {logoLoja ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoLoja} alt="" className="size-full object-cover" />
            ) : (
              nomeLoja.charAt(0)
            )}
          </div>
          <div>
            <p className="text-[.86rem] font-bold text-neutral-900">{nomeLoja}</p>
            <p className="text-[.74rem] text-neutral-400">Adicionar mais itens</p>
          </div>
        </div>

        {itens.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-neutral-300">
            <ShoppingBag size={30} />
            <p className="text-[.86rem] text-neutral-400">Nenhum item adicionado</p>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[.68rem] font-bold tracking-wide text-neutral-400 uppercase">Itens adicionados</p>
            <div>
              {itens.map((item) => {
                const obsExibivel = item.obs.startsWith("[combo]") ? item.obs.replace(/^\[combo\]\n?/, "") : item.obs;
                return (
                  <div key={item.key} className="flex gap-2.5 border-b border-neutral-100 py-2.5 last:border-0">
                    <div className="size-[50px] shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      <div className="flex size-full items-center justify-center text-neutral-300">
                        <ImageIcon size={16} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[.82rem] font-semibold text-neutral-900">{item.nome}</p>
                      {obsExibivel && <p className="mt-0.5 line-clamp-2 text-[.72rem] whitespace-pre-line text-neutral-400">{obsExibivel}</p>}
                      <p className="mt-0.5 text-[.82rem] font-bold" style={{ color: brown }}>
                        {formatarPreco(item.precoUnit)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <QtyStepper
                        size="sm"
                        value={item.qtd}
                        min={0}
                        onChange={(v) => (v <= 0 ? onRemover(item.key) : onAtualizarQtd(item.key, v))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </StoreSheet>
  );
}
