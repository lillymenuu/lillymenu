"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCartItem, PosCombo, PosComboDetalheResposta, PosComboPasso } from "@/lib/pos";

type Selecoes = Record<number, Record<number, number>>; // passoId -> opcaoId -> qtd

export function PosComboDialog({
  combo,
  onOpenChange,
  onAdicionar,
}: {
  combo: PosCombo | null;
  onOpenChange: (v: boolean) => void;
  onAdicionar: (item: Omit<PosCartItem, "rowKey">) => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const [passos, setPassos] = useState<PosComboPasso[]>([]);
  const [precoBase, setPrecoBase] = useState(0);
  const [selecoes, setSelecoes] = useState<Selecoes>({});

  useEffect(() => {
    if (!combo) return;
    setCarregando(true);
    setPassos([]);
    setSelecoes({});
    fetch(`/api/pos/combo-detalhe?id=${combo.id}`)
      .then((r) => r.json())
      .then((data: PosComboDetalheResposta) => {
        if (data.ok) {
          setPassos(data.passos ?? []);
          setPrecoBase(data.combo?.preco ?? combo.preco);
        }
      })
      .catch(() => setPassos([]))
      .finally(() => setCarregando(false));
  }, [combo]);

  const totalPorPasso = useMemo(() => {
    const map: Record<number, number> = {};
    for (const passo of passos) {
      map[passo.id] = Object.values(selecoes[passo.id] ?? {}).reduce((s, q) => s + q, 0);
    }
    return map;
  }, [passos, selecoes]);

  const adicionalTotal = useMemo(() => {
    let total = 0;
    for (const passo of passos) {
      for (const opcao of passo.opcoes) {
        const qtd = selecoes[passo.id]?.[opcao.id] ?? 0;
        total += qtd * opcao.preco;
      }
    }
    return total;
  }, [passos, selecoes]);

  const precoTotal = precoBase + adicionalTotal;

  const valido = passos.every((p) => {
    const qtd = totalPorPasso[p.id] ?? 0;
    if (p.obrigatorio && qtd < Math.max(1, p.min_itens)) return false;
    if (p.min_itens > 0 && qtd < p.min_itens) return false;
    if (p.max_itens > 0 && qtd > p.max_itens) return false;
    return true;
  });

  function alterarQtdOpcao(passo: PosComboPasso, opcaoId: number, delta: number) {
    setSelecoes((prev) => {
      const atualPasso = { ...(prev[passo.id] ?? {}) };
      const atual = atualPasso[opcaoId] ?? 0;
      let novo = atual + delta;
      if (novo < 0) novo = 0;

      const somaAtual = Object.entries(atualPasso).reduce((s, [id, q]) => (Number(id) === opcaoId ? s : s + q), 0);
      if (!passo.permite_repetir && novo > 1) novo = 1;
      if (passo.max_itens > 0 && somaAtual + novo > passo.max_itens) return prev;

      if (novo === 0) delete atualPasso[opcaoId];
      else atualPasso[opcaoId] = novo;
      return { ...prev, [passo.id]: atualPasso };
    });
  }

  if (!combo) return null;

  function confirmar() {
    if (!combo || !valido) return;
    const combosels = passos.flatMap((p) =>
      p.opcoes
        .filter((o) => (selecoes[p.id]?.[o.id] ?? 0) > 0)
        .map((o) => ({ id: o.id, nome: o.nome, qtd: selecoes[p.id]?.[o.id] ?? 0 }))
    );
    onAdicionar({
      produtoId: null,
      nome: combo.nome,
      qtd: 1,
      preco: precoTotal,
      observacoes: `[combo]\n${combosels.map((c) => `${c.qtd}x ${c.nome}`).join("\n")}`,
      usarPontos: false,
      combosels,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[480px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{combo.nome}</DialogTitle>
        </DialogHeader>

        {carregando ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Carregando combo...</div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {passos.map((passo) => (
              <div key={passo.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    {passo.nome}
                    {passo.obrigatorio ? <span className="ml-1 text-xs text-destructive">*</span> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {passo.max_itens > 0 ? `Escolha até ${passo.max_itens}` : passo.min_itens > 0 ? `Mín. ${passo.min_itens}` : ""}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {passo.opcoes.map((opcao) => {
                    const qtd = selecoes[passo.id]?.[opcao.id] ?? 0;
                    return (
                      <div
                        key={opcao.id}
                        className={`flex items-center justify-between rounded-lg border p-2.5 text-sm ${
                          opcao.esgotado ? "opacity-50" : ""
                        } ${qtd > 0 ? "border-primary bg-primary/5" : ""}`}
                      >
                        <div>
                          <div className="font-medium">{opcao.nome}</div>
                          {opcao.preco > 0 ? <div className="text-xs text-muted-foreground">+{formatBRL(opcao.preco)}</div> : null}
                          {opcao.esgotado ? <div className="text-xs text-destructive">Esgotado</div> : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7"
                            disabled={opcao.esgotado || qtd === 0}
                            onClick={() => alterarQtdOpcao(passo, opcao.id, -1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-4 text-center text-sm font-semibold">{qtd}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7"
                            disabled={opcao.esgotado}
                            onClick={() => alterarQtdOpcao(passo, opcao.id, 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button className="w-full" onClick={confirmar} disabled={carregando || !valido}>
            Adicionar · {formatBRL(precoTotal)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
