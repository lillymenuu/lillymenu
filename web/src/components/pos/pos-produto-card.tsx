"use client";

import { Plus, PackageX, Sparkles } from "lucide-react";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosProduto } from "@/lib/pos";

export function PosProdutoCard({ produto, onAdicionar }: { produto: PosProduto; onAdicionar: (produto: PosProduto) => void }) {
  const semEstoque = produto.estoque <= 0;
  const precoExibido = produto.preco_promocional ?? produto.preco;
  const emPromo = produto.preco_promocional !== null;

  return (
    <button
      type="button"
      disabled={semEstoque}
      onClick={() => onAdicionar(produto)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted">
        {produto.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={produto.imagem} alt={produto.nome} className="size-full object-cover" />
        ) : (
          <span className="text-2xl font-semibold text-muted-foreground/40">{produto.nome.charAt(0)}</span>
        )}
        {emPromo ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            <Sparkles className="size-3" /> Promo
          </span>
        ) : null}
        {semEstoque ? (
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-background/85 text-xs font-medium text-muted-foreground">
            <PackageX className="size-3.5" /> Sem estoque
          </div>
        ) : (
          <div className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            <Plus className="size-4" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <div className="line-clamp-2 text-xs font-medium leading-snug">{produto.nome}</div>
        <div className="mt-auto flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-foreground">
            {produto.tem_variacoes ? "A partir de " : ""}
            {formatBRL(precoExibido)}
          </span>
          {emPromo ? <span className="text-[11px] text-muted-foreground line-through">{formatBRL(produto.preco)}</span> : null}
        </div>
      </div>
    </button>
  );
}
