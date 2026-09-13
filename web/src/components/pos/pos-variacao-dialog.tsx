"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCartItem, PosProduto, PosVariacao } from "@/lib/pos";

export function PosVariacaoDialog({
  produto,
  onOpenChange,
  onAdicionar,
}: {
  produto: PosProduto | null;
  onOpenChange: (v: boolean) => void;
  onAdicionar: (item: Omit<PosCartItem, "rowKey">) => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const [variacoes, setVariacoes] = useState<PosVariacao[]>([]);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [qtd, setQtd] = useState(1);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (!produto) return;
    setCarregando(true);
    setVariacoes([]);
    setSelecionada(null);
    setQtd(1);
    setObservacoes("");
    fetch(`/api/pos/produto-variacoes?id=${produto.id}`)
      .then((r) => r.json())
      .then((data) => {
        const lista: PosVariacao[] = data.ok ? data.variacoes ?? [] : [];
        setVariacoes(lista);
        if (lista.length > 0) setSelecionada(lista[0].id);
      })
      .catch(() => setVariacoes([]))
      .finally(() => setCarregando(false));
  }, [produto]);

  if (!produto) return null;

  const variacaoAtual = variacoes.find((v) => v.id === selecionada);
  const preco = variacaoAtual ? variacaoAtual.preco : produto.preco;

  function confirmar() {
    if (!produto) return;
    const nomeVariacao = variacaoAtual ? [variacaoAtual.tamanho, variacaoAtual.cor].filter(Boolean).join(" - ") : null;
    onAdicionar({
      produtoId: produto.id,
      nome: nomeVariacao ? `${produto.nome} (${nomeVariacao})` : produto.nome,
      qtd,
      preco,
      observacoes: observacoes.trim(),
      usarPontos: false,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{produto.nome}</DialogTitle>
        </DialogHeader>

        {carregando ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Carregando opções...</div>
        ) : (
          <div className="space-y-4">
            {variacoes.length > 0 ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Escolha uma opção</Label>
                <div className="space-y-1.5">
                  {variacoes.map((v) => {
                    const label = [v.tamanho, v.cor].filter(Boolean).join(" - ") || `Opção #${v.id}`;
                    return (
                      <label
                        key={v.id}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-sm transition-colors ${
                          selecionada === v.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="variacao"
                            checked={selecionada === v.id}
                            onChange={() => setSelecionada(v.id)}
                            className="accent-primary"
                          />
                          {label}
                        </span>
                        <span className="font-medium">{formatBRL(v.preco)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: sem cebola"
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Quantidade</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="size-8" onClick={() => setQtd((q) => Math.max(1, q - 1))}>
                  <Minus className="size-3.5" />
                </Button>
                <span className="w-6 text-center text-sm font-semibold">{qtd}</span>
                <Button variant="outline" size="icon" className="size-8" onClick={() => setQtd((q) => q + 1)}>
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button className="w-full" onClick={confirmar} disabled={carregando}>
            Adicionar · {formatBRL(preco * qtd)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
