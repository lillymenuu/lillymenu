"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Minus, Package, Plus } from "lucide-react";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosProduto } from "@/lib/pos";

export function PosProdutoCard({
  produto,
  qtd,
  estoqueRestante,
  onAdicionar,
  onAlterarQtd,
  onDefinirQtd,
}: {
  produto: PosProduto;
  qtd: number;
  estoqueRestante: number;
  onAdicionar: (produto: PosProduto) => void;
  onAlterarQtd: (delta: number) => void;
  onDefinirQtd: (qtd: number) => void;
}) {
  const semEstoque = produto.estoque <= 0;
  const precoExibido = produto.preco_promocional ?? produto.preco;
  const emPromo = produto.preco_promocional !== null;
  const restante = Math.max(0, estoqueRestante);
  const selecionado = qtd > 0;

  const [texto, setTexto] = useState(String(qtd));

  useEffect(() => {
    setTexto(String(qtd));
  }, [qtd]);

  function confirmarTexto() {
    const n = Math.max(0, Math.floor(Number(texto.replace(/\D/g, "")) || 0));
    onDefinirQtd(n);
    setTexto(String(n));
  }

  return (
    <div
      onClick={() => produto.tem_variacoes && !semEstoque && onAdicionar(produto)}
      className={`flex h-[246px] w-[182px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card transition-colors ${
        selecionado ? "border-primary bg-primary/5" : ""
      } ${semEstoque ? "opacity-50" : ""} ${produto.tem_variacoes && !semEstoque ? "cursor-pointer" : ""}`}
    >
      <div className="relative h-[124px] shrink-0 bg-muted">
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
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden px-2 pt-1.5">
        <div className="line-clamp-2 text-[12.5px] leading-tight font-medium text-foreground">{produto.nome}</div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold">
            {produto.tem_variacoes ? "A partir de " : ""}
            {formatBRL(precoExibido)}
          </span>
          {emPromo ? <span className="text-[11px] text-muted-foreground line-through">{formatBRL(produto.preco)}</span> : null}
        </div>
        <div
          className={`mt-0.5 flex w-fit items-center gap-1 text-[10px] font-medium ${
            restante > 0 ? "text-muted-foreground" : "rounded-full bg-destructive/10 px-1.5 py-0.5 text-destructive"
          }`}
        >
          {restante > 0 ? <Package className="size-2.5 shrink-0" /> : <AlertCircle className="size-2.5 shrink-0" />}
          {restante > 0 ? `${restante} em estoque` : "Sem estoque"}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-center gap-2 p-1.5">
        <button
          type="button"
          disabled={semEstoque || qtd === 0 || produto.tem_variacoes}
          onClick={() => onAlterarQtd(-1)}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        {produto.tem_variacoes ? (
          <span className="w-7 text-center text-sm font-semibold tabular-nums">{qtd}</span>
        ) : (
          <input
            type="text"
            inputMode="numeric"
            disabled={semEstoque}
            value={texto}
            onChange={(e) => setTexto(e.target.value.replace(/\D/g, ""))}
            onFocus={(e) => e.target.select()}
            onBlur={confirmarTexto}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="w-7 shrink-0 rounded-md border-0 bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
          />
        )}
        <button
          type="button"
          disabled={semEstoque || (!produto.tem_variacoes && restante <= 0)}
          onClick={(e) => {
            e.stopPropagation();
            produto.tem_variacoes ? onAdicionar(produto) : onAlterarQtd(1);
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
