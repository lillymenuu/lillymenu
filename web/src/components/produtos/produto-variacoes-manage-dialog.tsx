"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "./money-input";
import type { ProdutoVariacaoItem } from "@/lib/produtos";

/*
 * So atualiza o estado em memoria do form de produto via onSalvar — nao
 * chama API sozinho, quem salva de verdade e o "Salvar" do produto
 * (igual ao legado, admin/produtos.js).
 */
export function ProdutoVariacoesManageDialog({
  open,
  onOpenChange,
  variacoes,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  variacoes: ProdutoVariacaoItem[];
  onSalvar: (variacoes: ProdutoVariacaoItem[]) => void;
}) {
  const [linhas, setLinhas] = useState<ProdutoVariacaoItem[]>([]);

  useEffect(() => {
    if (open) setLinhas(variacoes.length ? variacoes : [{ tamanho: "", cor: "", preco: "" }]);
  }, [open, variacoes]);

  function adicionarLinha() {
    setLinhas((prev) => [...prev, { tamanho: "", cor: "", preco: "" }]);
  }

  function removerLinha(idx: number) {
    setLinhas((prev) => prev.filter((_, i) => i !== idx));
  }

  function atualizarLinha(idx: number, patch: Partial<ProdutoVariacaoItem>) {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function salvar() {
    const validas = linhas.filter((l) => l.tamanho.trim() !== "" || l.cor.trim() !== "" || Number(l.preco) > 0);
    onSalvar(validas);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] w-[520px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[520px]">
        <DialogHeader className="flex-row items-start justify-between pr-8">
          <div>
            <DialogTitle>Variações do produto</DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">Cadastre tamanhos, cores e preços para usar no pedido.</p>
          </div>
          <button
            type="button"
            onClick={adicionarLinha}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted"
            aria-label="Adicionar variação"
          >
            <Plus size={16} />
          </button>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {linhas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma variação cadastrada.</p>
          ) : (
            linhas.map((linha, idx) => (
              <div key={idx} className="flex items-end gap-2 rounded-lg border p-2.5">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Tamanho</label>
                  <Input
                    value={linha.tamanho}
                    onChange={(e) => atualizarLinha(idx, { tamanho: e.target.value })}
                    placeholder="Ex.: 500ml"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Cor</label>
                  <Input
                    value={linha.cor}
                    onChange={(e) => atualizarLinha(idx, { cor: e.target.value })}
                    placeholder="Ex.: Vermelho"
                  />
                </div>
                <div className="w-28 space-y-1">
                  <label className="text-xs text-muted-foreground">Preço</label>
                  <MoneyInput value={String(linha.preco ?? "")} onChange={(v) => atualizarLinha(idx, { preco: v })} />
                </div>
                <button
                  type="button"
                  onClick={() => removerLinha(idx)}
                  className="mb-0.5 shrink-0 rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remover"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button onClick={salvar} className="w-full sm:w-auto">
            Salvar variações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
