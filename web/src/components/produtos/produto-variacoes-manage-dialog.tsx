"use client";

import { useEffect, useState } from "react";
import { Box, Plus, Trash2 } from "lucide-react";
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
  controlaEstoque,
  variacoes,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  obrigatorio: boolean;
  /** Estoque por variacao ligado: cada linha ganha o campo Estoque. */
  controlaEstoque: boolean;
  variacoes: ProdutoVariacaoItem[];
  onSalvar: (dados: { titulo: string; obrigatorio: boolean; controlaEstoque: boolean; variacoes: ProdutoVariacaoItem[] }) => void;
}) {
  const [tituloEditado, setTituloEditado] = useState("Variações do produto");
  const [obrigatorioEditado, setObrigatorioEditado] = useState(true);
  const [estoqueEditado, setEstoqueEditado] = useState(false);
  const [linhas, setLinhas] = useState<ProdutoVariacaoItem[]>([]);

  useEffect(() => {
    if (open) {
      setTituloEditado(titulo.trim() || "Variações do produto");
      setObrigatorioEditado(obrigatorio);
      setEstoqueEditado(controlaEstoque);
      setLinhas(variacoes.length ? variacoes : [{ tamanho: "", cor: "", preco: "" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variacoes, titulo, obrigatorio, controlaEstoque]);

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
    onSalvar({ titulo: tituloEditado.trim() || "Variações do produto", obrigatorio: obrigatorioEditado, controlaEstoque: estoqueEditado, variacoes: validas });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex max-h-[80vh] max-w-[calc(100%-2rem)] flex-col rounded-3xl ${estoqueEditado ? "w-[620px] sm:max-w-[620px]" : "w-[520px] sm:max-w-[520px]"}`}
      >
        <DialogHeader className="flex-row items-start justify-between gap-2 pr-8">
          <DialogTitle className="sr-only">Variações do produto</DialogTitle>
          <div className="flex-1 space-y-2.5">
            <Input
              value={tituloEditado}
              onChange={(e) => setTituloEditado(e.target.value)}
              placeholder="Ex.: Escolha o tamanho"
              className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm font-medium"
            />
            <p className="text-xs text-muted-foreground">Cadastre tamanhos, cores e preços para usar no pedido.</p>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={obrigatorioEditado} onCheckedChange={(v) => setObrigatorioEditado(v === true)} />
              Obrigatório escolher uma opção
            </label>
            {estoqueEditado ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                  <Box size={13} /> Estoque por variação ativo
                </span>
                <button type="button" onClick={() => setEstoqueEditado(false)} className="text-muted-foreground hover:text-destructive hover:underline">
                  Remover estoque das variações
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEstoqueEditado(true)}
                className="flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-primary hover:bg-muted"
              >
                <Box size={13} /> Criar estoque das variações
              </button>
            )}
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
                    className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Cor</label>
                  <Input
                    value={linha.cor}
                    onChange={(e) => atualizarLinha(idx, { cor: e.target.value })}
                    placeholder="Ex.: Vermelho"
                    className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                  />
                </div>
                <div className="w-28 space-y-1">
                  <label className="text-xs text-muted-foreground">Preço</label>
                  <MoneyInput
                    value={String(linha.preco ?? "")}
                    onChange={(v) => atualizarLinha(idx, { preco: v })}
                    className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                  />
                </div>
                {estoqueEditado && (
                  <div className="w-20 space-y-1">
                    <label className="text-xs text-muted-foreground">Estoque</label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={String(linha.estoque ?? 0)}
                      onChange={(e) => atualizarLinha(idx, { estoque: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      className="h-10 w-full rounded-full border-0 bg-muted/60 px-3 text-sm"
                    />
                  </div>
                )}
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

        <DialogFooter className="border-t-0 bg-transparent">
          <Button onClick={salvar} className="w-full rounded-full sm:w-auto">
            Salvar variações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
