"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Categoria } from "@/lib/produtos";
import { cn } from "cn";

/** Primeiro passo do novo combo: escolher a categoria (secao do cardapio) onde ele vai aparecer. */
export function ComboCategoriaDialog({
  open,
  onOpenChange,
  categorias,
  inicial,
  onContinuar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categorias: Categoria[];
  inicial?: number | null;
  onContinuar: (categoriaId: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayForceRender className="flex max-h-[90vh] w-[600px] flex-col gap-0 rounded-3xl p-0 sm:max-w-[600px]">
        <Corpo
          categorias={categorias}
          inicial={inicial ?? null}
          onCancelar={() => onOpenChange(false)}
          onContinuar={onContinuar}
        />
      </DialogContent>
    </Dialog>
  );
}

/* Montado a cada abertura do modal: o estado comeca da categoria inicial. */
function Corpo({
  categorias,
  inicial,
  onCancelar,
  onContinuar,
}: {
  categorias: Categoria[];
  inicial: number | null;
  onCancelar: () => void;
  onContinuar: (categoriaId: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const [escolhida, setEscolhida] = useState<number | null>(inicial);

  const termo = busca.trim().toLowerCase();
  const lista = termo
    ? categorias.filter((c) => c.nome.toLowerCase().includes(termo))
    : categorias;

  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-2">
        <DialogTitle className="text-base">Escolha uma categoria</DialogTitle>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <p className="text-sm text-muted-foreground">
          A categoria é a seção do cardápio onde o combo aparece para o cliente,
          como lanches, bebidas ou sobremesas.
        </p>
        <label
          className="mt-4 mb-1.5 block text-sm font-medium"
          htmlFor="combo-cat-busca"
        >
          Buscar categoria
        </label>
        <Input
          id="combo-cat-busca"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Busque pelo nome..."
          className="h-10 rounded-full border-0 bg-muted/60 px-4"
        />
        <p className="mt-4 mb-2.5 text-sm text-muted-foreground">
          Este combo pertence a qual categoria?
        </p>

        <div className="space-y-2.5 p-0.5" role="radiogroup">
          {lista.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma categoria encontrada.
            </p>
          ) : (
            lista.map((c) => {
              const ativa = escolhida === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={ativa}
                  onClick={() => setEscolhida(c.id)}
                  onDoubleClick={() => onContinuar(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] font-medium transition-colors",
                    ativa ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[18px] shrink-0 items-center justify-center rounded-full border-2",
                      ativa ? "border-primary" : "border-muted-foreground/40",
                    )}
                  >
                    {ativa && (
                      <span className="size-2 rounded-full bg-primary" />
                    )}
                  </span>
                  <span className="min-w-0 truncate">{c.nome}</span>
                  {c.ativo !== 1 && (
                    <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground">
                      pausada
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <DialogFooter className="mx-0 mb-0 rounded-b-3xl border-t-0 bg-transparent px-6 pt-2 pb-6">
        <Button variant="outline" className="rounded-full" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          className="rounded-full px-5"
          disabled={escolhida === null}
          onClick={() => escolhida !== null && onContinuar(escolhida)}
        >
          Continuar
        </Button>
      </DialogFooter>
    </>
  );
}
