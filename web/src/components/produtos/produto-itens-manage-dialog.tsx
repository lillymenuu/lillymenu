"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "./money-input";
import type { ProdutoItemExtra } from "@/lib/produtos";

/*
 * Modal generico de "nome + preco + obrigatorio", reaproveitado tanto pra
 * Extras ("Escolha seu extra") quanto pra Complementos ("Escolha o tipo")
 * — mesmo shape de dado nos dois no legado (admin/produtos.js), so muda
 * o texto. So atualiza o estado em memoria do form de produto via
 * onSalvar — nao chama API sozinho, quem salva de verdade e o "Salvar"
 * do produto (igual ao legado).
 */
export function ProdutoItensManageDialog({
  open,
  onOpenChange,
  titulo,
  descricao,
  labelNome,
  itens,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  descricao: string;
  labelNome: string;
  itens: ProdutoItemExtra[];
  onSalvar: (itens: ProdutoItemExtra[]) => void;
}) {
  const [linhas, setLinhas] = useState<ProdutoItemExtra[]>([]);

  useEffect(() => {
    if (open) setLinhas(itens.length ? itens : [{ nome: "", preco: "", obrigatorio: false }]);
  }, [open, itens]);

  function adicionarLinha() {
    setLinhas((prev) => [...prev, { nome: "", preco: "", obrigatorio: false }]);
  }

  function removerLinha(idx: number) {
    setLinhas((prev) => prev.filter((_, i) => i !== idx));
  }

  function atualizarLinha(idx: number, patch: Partial<ProdutoItemExtra>) {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function salvar() {
    const validas = linhas.filter((l) => l.nome.trim() !== "" || Number(l.preco) > 0);
    onSalvar(validas);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] w-[520px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[520px]">
        <DialogHeader className="flex-row items-start justify-between pr-8">
          <div>
            <DialogTitle>{titulo}</DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>
          </div>
          <button
            type="button"
            onClick={adicionarLinha}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted"
            aria-label={`Adicionar ${labelNome.toLowerCase()}`}
          >
            <Plus size={16} />
          </button>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {linhas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum {labelNome.toLowerCase()} cadastrado.</p>
          ) : (
            linhas.map((linha, idx) => (
              <div key={idx} className="flex items-end gap-2 rounded-lg border p-2.5">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Nome</label>
                  <Input
                    value={linha.nome}
                    onChange={(e) => atualizarLinha(idx, { nome: e.target.value })}
                    placeholder={`Ex.: ${labelNome}`}
                  />
                </div>
                <div className="w-28 space-y-1">
                  <label className="text-xs text-muted-foreground">Preço</label>
                  <MoneyInput value={String(linha.preco ?? "")} onChange={(v) => atualizarLinha(idx, { preco: v })} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-xs text-muted-foreground">Obrigatório</label>
                  <Switch
                    checked={linha.obrigatorio}
                    onCheckedChange={(v) => atualizarLinha(idx, { obrigatorio: v === true })}
                  />
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
            Salvar {labelNome.toLowerCase()}s
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
