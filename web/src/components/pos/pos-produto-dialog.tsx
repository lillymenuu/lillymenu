"use client";

import { useState } from "react";
import { Minus, Package, Plus, ShoppingBag, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosProduto } from "@/lib/pos";

/**
 * Modal de produto simples (sem variacoes nem complementos) do PDV balcao no computador:
 * foto grande a esquerda; nome, preco, descricao, observacao, quantidade e Adicionar a direita.
 * Produtos com opcoes continuam abrindo o PosVariacaoDialog.
 * O pai monta este componente so quando abre (com key do produto), entao o estado nasce zerado.
 */
export function PosProdutoDialog({
  produto,
  estoqueDisponivel,
  onOpenChange,
  onAdicionar,
}: {
  produto: PosProduto;
  /** Unidades que ainda cabem no carrinho (estoque menos o que o carrinho ja consome). */
  estoqueDisponivel: number;
  onOpenChange: (v: boolean) => void;
  onAdicionar: (qtd: number, observacoes: string) => void;
}) {
  const [qtd, setQtd] = useState(1);
  const [observacoes, setObservacoes] = useState("");

  const limite = Math.max(0, estoqueDisponivel);
  const preco = produto.preco_promocional ?? produto.preco;
  const emPromo = produto.preco_promocional !== null;
  const podeAdicionar = limite > 0 && qtd >= 1 && qtd <= limite;

  function confirmar() {
    if (!podeAdicionar) return;
    onAdicionar(qtd, observacoes.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(810px,calc(100vh-48px))] w-[1080px] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[24px] p-0 sm:max-w-[1080px]"
      >
        <DialogTitle className="sr-only">{produto.nome}</DialogTitle>

        {/* Foto grande */}
        <div className="flex w-1/2 shrink-0 p-5">
          <div className="size-full overflow-hidden rounded-2xl bg-muted">
            {produto.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produto.imagem} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground/40">
                <ShoppingBag className="size-16" />
              </div>
            )}
          </div>
        </div>

        {/* Informacoes e acoes */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 justify-end px-5 pt-5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
              className="flex size-9 cursor-pointer items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto bg-muted/40 px-5 py-6">
            <h2 className="text-lg leading-tight font-semibold">{produto.nome}</h2>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl font-bold text-primary">{formatBRL(preco)}</span>
              {emPromo && <span className="text-sm text-muted-foreground line-through">{formatBRL(produto.preco)}</span>}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="size-3.5" />
              {limite > 0 ? `${limite} em estoque` : "Sem estoque"}
            </div>
            {produto.descricao && (
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{produto.descricao}</p>
            )}

            <label className="mt-6 block">
              <span className="mb-1.5 block text-sm font-medium">Observações do cliente</span>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: sem cebola, molho à parte..."
                rows={2}
                className="w-full resize-none rounded-2xl border bg-background px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
          </div>

          {/* Rodape: quantidade e confirmar */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t px-5 py-4">
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-1">
              <button
                type="button"
                disabled={qtd <= 1}
                onClick={() => setQtd((q) => Math.max(1, q - 1))}
                aria-label="Diminuir quantidade"
                className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-background shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold tabular-nums">{qtd}</span>
              <button
                type="button"
                disabled={qtd >= limite}
                onClick={() => setQtd((q) => Math.min(q + 1, limite))}
                aria-label="Aumentar quantidade"
                className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={confirmar}
              disabled={!podeAdicionar}
              className="h-11 cursor-pointer rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {limite > 0 ? `Adicionar ${formatBRL(preco * qtd)}` : "Sem estoque"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
