"use client";

import { Minus, Plus } from "lucide-react";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosProduto } from "@/lib/pos";

export function PosProdutoCard({
  produto,
  qtd,
  onAdicionar,
  onAlterarQtd,
}: {
  produto: PosProduto;
  qtd: number;
  onAdicionar: (produto: PosProduto) => void;
  onAlterarQtd: (delta: number) => void;
}) {
  const semEstoque = produto.estoque <= 0;
  const precoExibido = produto.preco_promocional ?? produto.preco;
  const emPromo = produto.preco_promocional !== null;

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border bg-card ${semEstoque ? "opacity-50" : ""}`}>
      <div className="relative aspect-[4/3] bg-muted">
        {produto.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={produto.imagem} alt={produto.nome} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-lg font-semibold text-muted-foreground/40">
            {produto.nome.charAt(0)}
          </div>
        )}
        {emPromo ? (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            Promo
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 px-2 pt-1.5">
        <div className="line-clamp-2 text-[12.5px] leading-tight font-medium text-foreground">{produto.nome}</div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold">
            {produto.tem_variacoes ? "A partir de " : ""}
            {formatBRL(precoExibido)}
          </span>
          {emPromo ? <span className="text-[11px] text-muted-foreground line-through">{formatBRL(produto.preco)}</span> : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-1 p-1.5">
        <button
          type="button"
          disabled={semEstoque || qtd === 0 || produto.tem_variacoes}
          onClick={() => onAlterarQtd(-1)}
          className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="text-sm font-semibold tabular-nums">{qtd}</span>
        <button
          type="button"
          disabled={semEstoque}
          onClick={() => (produto.tem_variacoes ? onAdicionar(produto) : onAlterarQtd(1))}
          className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
