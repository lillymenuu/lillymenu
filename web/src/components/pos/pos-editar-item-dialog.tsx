"use client";

import { useEffect, useState } from "react";
import { Layers, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCartItem } from "@/lib/pos";

const CABECALHO_COMBO = "[combo]";

/**
 * Item de combo guarda tudo em `observacoes`: "[combo]", uma linha por opcao escolhida ("1x Nome")
 * e, no fim, a observacao livre do cliente. Separa a composicao da observacao pra mostrar cada uma
 * no seu lugar. Sem `combosels` (pedido reaberto) nao da pra saber onde a composicao acaba, entao a
 * observacao fica travada e o texto original e preservado.
 */
function separarCombo(item: PosCartItem) {
  const ehCombo = item.observacoes.startsWith(CABECALHO_COMBO);
  if (!ehCombo) return { ehCombo: false, composicao: [] as string[], obsCliente: item.observacoes, editavel: true };
  const linhas = item.observacoes.split("\n").slice(1);
  const n = item.combosels?.length ?? 0;
  if (n === 0) return { ehCombo: true, composicao: linhas, obsCliente: "", editavel: false };
  return { ehCombo: true, composicao: linhas.slice(0, n), obsCliente: linhas.slice(n).join("\n"), editavel: true };
}

export function PosEditarItemDialog({
  item,
  onOpenChange,
  onSalvar,
}: {
  item: PosCartItem | null;
  onOpenChange: (v: boolean) => void;
  onSalvar: (rowKey: string, qtd: number, observacoes: string) => void;
}) {
  const [qtd, setQtd] = useState(1);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (item) {
      setQtd(item.qtd);
      setObservacoes(separarCombo(item).obsCliente);
    }
  }, [item]);

  if (!item) return null;

  const combo = separarCombo(item);
  const limiteEstoque = item.estoque !== undefined ? Math.max(1, item.estoque) : undefined;
  const atingiuLimite = limiteEstoque !== undefined && qtd >= limiteEstoque;

  function salvar() {
    if (!item) return;
    let texto = observacoes;
    if (combo.ehCombo) {
      if (!combo.editavel) {
        texto = item.observacoes;
      } else {
        const obs = observacoes.trim();
        texto = `${CABECALHO_COMBO}\n${combo.composicao.join("\n")}${obs ? `\n${obs}` : ""}`;
      }
    }
    onSalvar(item.rowKey, qtd, texto);
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] w-[480px] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[480px]"
      >
        <DialogTitle className="sr-only">{item.nome}</DialogTitle>

        {/* Cabecalho */}
        <div className="flex shrink-0 items-start gap-3 px-4 pt-4 pb-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            {item.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imagem} alt={item.nome} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground/40">
                {combo.ehCombo ? <Layers className="size-6" /> : <ShoppingBag className="size-5" />}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="line-clamp-2 text-base leading-tight font-semibold">{item.nome}</div>
            <div className="text-sm font-semibold text-emerald-600">{formatBRL(item.preco)}</div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
          {combo.ehCombo && combo.composicao.length > 0 && (
            <section className="overflow-hidden rounded-xl border">
              <div className="bg-muted/60 px-4 py-2.5 text-sm font-semibold">Itens do combo</div>
              <ul className="divide-y bg-background">
                {combo.composicao.map((linha, i) => {
                  const m = linha.match(/^(\d+)x\s+(.*)$/);
                  return (
                    <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      {m ? (
                        <>
                          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary tabular-nums">
                            {m[1]}x
                          </span>
                          <span className="min-w-0 flex-1">{m[2]}</span>
                        </>
                      ) : (
                        <span className="min-w-0 flex-1">{linha}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {(!combo.ehCombo || combo.editavel) && (
            <label className="block rounded-xl bg-muted/60 px-3 py-2">
              <span className="block text-[11px] text-muted-foreground">Observações do cliente</span>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: retirar cebola, molho à parte..."
                rows={2}
                className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
            </label>
          )}
        </div>

        {/* Rodape */}
        <div className="shrink-0 space-y-2 border-t bg-background px-4 pt-3 pb-4">
          {atingiuLimite && (
            <p className="text-xs font-medium text-destructive">Quantidade do item indisponível no momento! Limite em estoque: {limiteEstoque}.</p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-1">
              <button
                type="button"
                disabled={qtd <= 1}
                onClick={() => setQtd((q) => Math.max(1, q - 1))}
                aria-label="Diminuir quantidade"
                className="flex size-9 items-center justify-center rounded-full bg-background shadow-sm transition-transform active:scale-95 disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">{qtd}</span>
              <button
                type="button"
                disabled={atingiuLimite}
                onClick={() => setQtd((q) => (limiteEstoque !== undefined ? Math.min(q + 1, limiteEstoque) : q + 1))}
                aria-label="Aumentar quantidade"
                className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={salvar}
              className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Editar · {formatBRL(item.preco * qtd)}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
