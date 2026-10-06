"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "cn";
import { MoneyInput } from "./money-input";
import type { ProdutoGrupoOpcoes, ProdutoOpcaoItem } from "@/lib/produtos";

/*
 * Editor de UM grupo de opcoes configuravel (ex.: "Escolha seu extra",
 * "Coberturas", "Escolha o tamanho do acai") — generaliza o antigo modal
 * fixo de Extras/Tipo pra qualquer numero de grupos, com titulo, tipo de
 * selecao (unica/multipla) e obrigatoriedade proprios por grupo. So
 * atualiza o estado em memoria do form de produto via onSalvar — quem
 * salva de verdade e o "Salvar" do produto.
 */
export function ProdutoGrupoOpcoesDialog({
  open,
  onOpenChange,
  grupo,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null = criando um grupo novo. */
  grupo: ProdutoGrupoOpcoes | null;
  onSalvar: (grupo: ProdutoGrupoOpcoes) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [tipoSelecao, setTipoSelecao] = useState<"unica" | "multipla">("unica");
  const [obrigatorio, setObrigatorio] = useState(false);
  const [maxSelecao, setMaxSelecao] = useState("");
  const [itens, setItens] = useState<ProdutoOpcaoItem[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitulo(grupo?.titulo ?? "");
    setTipoSelecao(grupo?.tipoSelecao ?? "unica");
    setObrigatorio(grupo?.obrigatorio ?? false);
    setMaxSelecao(grupo?.maxSelecao ? String(grupo.maxSelecao) : "");
    setItens(grupo?.itens.length ? grupo.itens : [{ nome: "", preco: "" }]);
  }, [open, grupo]);

  function adicionarLinha() {
    setItens((prev) => [...prev, { nome: "", preco: "" }]);
  }

  function removerLinha(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  function atualizarLinha(idx: number, patch: Partial<ProdutoOpcaoItem>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function salvar() {
    const validos = itens.filter((it) => it.nome.trim() !== "" || Number(it.preco) > 0);
    onSalvar({
      id: grupo?.id,
      titulo: titulo.trim() || "Grupo de opções",
      tipoSelecao,
      obrigatorio,
      maxSelecao: tipoSelecao === "multipla" ? Math.max(0, parseInt(maxSelecao, 10) || 0) : 0,
      itens: validos,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] w-[520px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[520px]">
        <DialogHeader className="flex-row items-start justify-between gap-2 pr-8">
          <DialogTitle className="sr-only">{grupo ? "Editar grupo de opções" : "Novo grupo de opções"}</DialogTitle>
          <div className="flex-1 space-y-2.5">
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Escolha as coberturas" className="text-sm font-medium" />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg border p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTipoSelecao("unica")}
                  className={cn("rounded-md px-2.5 py-1 font-medium transition-colors", tipoSelecao === "unica" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  Seleção única
                </button>
                <button
                  type="button"
                  onClick={() => setTipoSelecao("multipla")}
                  className={cn("rounded-md px-2.5 py-1 font-medium transition-colors", tipoSelecao === "multipla" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  Seleção múltipla
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={obrigatorio} onCheckedChange={(v) => setObrigatorio(v === true)} />
                Obrigatório
              </label>
            </div>
            {tipoSelecao === "multipla" && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Máximo de itens que o cliente pode escolher
                <Input
                  type="number"
                  min={0}
                  value={maxSelecao}
                  onChange={(e) => setMaxSelecao(e.target.value)}
                  placeholder="Sem limite"
                  className="h-7 w-20 text-xs"
                />
              </label>
            )}
          </div>
          <button
            type="button"
            onClick={adicionarLinha}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted"
            aria-label="Adicionar opção"
          >
            <Plus size={16} />
          </button>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {itens.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma opção cadastrada.</p>
          ) : (
            itens.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2 rounded-lg border p-2.5">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Nome</label>
                  <Input value={item.nome} onChange={(e) => atualizarLinha(idx, { nome: e.target.value })} placeholder="Ex.: Granola" />
                </div>
                <div className="w-28 space-y-1">
                  <label className="text-xs text-muted-foreground">Preço</label>
                  <MoneyInput value={String(item.preco ?? "")} onChange={(v) => atualizarLinha(idx, { preco: v })} />
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
            Salvar grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
