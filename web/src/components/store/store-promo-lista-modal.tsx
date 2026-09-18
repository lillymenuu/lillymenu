"use client";

import { ImageIcon, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatarPreco } from "@/lib/store/format";
import type { StoreProduto } from "@/lib/store/types";

const ETIQUETA_LABEL: Record<string, string> = {
  recomendado: "Recomendado",
  mais_pedido: "Mais pedido",
  novidade: "Novidade",
  edicao_limitada: "Edição limitada",
};

const ETIQUETA_CORES: Record<string, { bg: string; texto: string }> = {
  recomendado: { bg: "#eff6ff", texto: "#2563eb" },
  mais_pedido: { bg: "#fffbeb", texto: "#b45309" },
  novidade: { bg: "#f0fdf4", texto: "#16a34a" },
  edicao_limitada: { bg: "#faf5ff", texto: "#9333ea" },
};

/** Modal "Promoções" (lista de produtos em promo) — mesmo fluxo do promoListaModal legado. */
export function StorePromoListaModal({
  open,
  onOpenChange,
  produtos,
  onSelecionar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  produtos: StoreProduto[];
  onSelecionar: (produto: StoreProduto) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[92vh] max-w-[420px] flex-col gap-0 overflow-hidden rounded-[22px] p-0 sm:max-w-[420px]">
        <div className="flex shrink-0 items-center justify-between px-[18px] pt-[18px] pb-1">
          <DialogTitle className="text-[1.05rem] font-bold text-neutral-900">Promoções</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {produtos.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-3.5 flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
                <Search size={22} />
              </div>
              <p className="text-[.78rem] leading-relaxed font-bold tracking-wide text-neutral-400 uppercase">
                Nenhuma promoção
                <br />
                encontrada
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 px-3.5 py-3">
              {produtos.map((p) => {
                const etiqueta = p.promo_etiqueta ? ETIQUETA_LABEL[p.promo_etiqueta] : null;
                const cor = p.promo_etiqueta ? ETIQUETA_CORES[p.promo_etiqueta] : null;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelecionar(p)}
                    className="flex items-start gap-3 rounded-2xl border border-neutral-100 p-3 text-left transition-colors hover:border-neutral-200 hover:bg-neutral-50"
                  >
                    <div className="min-w-0 flex-1">
                      {etiqueta && cor && (
                        <span
                          className="mb-1.5 inline-block animate-pulse rounded-full px-2 py-[3px] text-[.6rem] font-bold tracking-wide uppercase"
                          style={{ background: cor.bg, color: cor.texto }}
                        >
                          {etiqueta}
                        </span>
                      )}
                      <p className="mb-0.5 text-[.86rem] leading-tight font-bold text-neutral-900">{p.nome}</p>
                      {p.descricao && <p className="mb-2 line-clamp-2 text-[.72rem] leading-snug text-neutral-400">{p.descricao}</p>}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[.74rem] text-neutral-300 line-through">{formatarPreco(p.preco_base)}</span>
                        <span className="text-[.92rem] font-bold text-neutral-900">{formatarPreco(p.preco_final)}</span>
                        <span className="rounded-full bg-emerald-600 px-1.5 py-[2px] text-[.68rem] font-bold text-white">-{p.desc_pct}%</span>
                      </div>
                    </div>
                    <div className="size-[92px] shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                      {p.imagem ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imagem} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-neutral-300">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
