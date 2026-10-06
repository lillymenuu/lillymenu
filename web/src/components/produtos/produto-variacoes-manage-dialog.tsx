"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  titulo,
  obrigatorio,
  variacoes,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  obrigatorio: boolean;
  variacoes: ProdutoVariacaoItem[];
  onSalvar: (dados: { titulo: string; obrigatorio: boolean; variacoes: ProdutoVariacaoItem[] }) => void;
}) {
  const [tituloEditado, setTituloEditado] = useState("Variações do produto");
  const [obrigatorioEditado, setObrigatorioEditado] = useState(true);
  const [linhas, setLinhas] = useState<ProdutoVariacaoItem[]>([]);

  useEffect(() => {
    if (open) {
      setTituloEditado(titulo.trim() || "Variações do produto");
      setObrigatorioEditado(obrigatorio);
      setLinhas(variacoes.length ? variacoes : [{ tamanho: "", cor: "", preco: "" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variacoes, titulo, obrigatorio]);

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
    onSalvar({ titulo: tituloEditado.trim() || "Variações do produto", obrigatorio: obrigatorioEditado, variacoes: validas });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] w-[520px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[520px]">
        <DialogHeader className="flex-row items-start justify-between gap-2 pr-8">
          <DialogTitle className="sr-only">Variações do produto</DialogTitle>
          <div className="flex-1 space-y-2.5">
            <Input
              value={tituloEditado}
              onChange={(e) => setTituloEditado(e.target.value)}
              placeholder="Ex.: Escolha o tamanho"
              className="text-sm font-medium"
            />
            <p className="text-xs text-muted-foreground">Cadastre tamanhos, cores e preços para usar no pedido.</p>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={obrigatorioEditado} onCheckedChange={(v) => setObrigatorioEditado(v === true)} />
              Obrigatório escolher uma opção
            </label>
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
