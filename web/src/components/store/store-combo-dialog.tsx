"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, ImageIcon, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCartItem, StoreCombo, StoreComboPasso } from "@/lib/store/types";

type Selecao = Record<number, number>; // opcao_id -> qty

export function StoreComboDialog({
  combo,
  lojaId,
  open,
  onOpenChange,
  onAdicionar,
}: {
  combo: StoreCombo | null;
  lojaId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdicionar: (item: Omit<StoreCartItem, "key">) => void;
}) {
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const [passos, setPassos] = useState<StoreComboPasso[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [selecoes, setSelecoes] = useState<Record<number, Selecao>>({}); // passo_id -> {opcao_id: qty}

  useEffect(() => {
    if (!open || !combo) return;
    setQtd(1);
    setObs("");
    setPassos([]);
    setSelecoes({});
    setCarregando(true);
    fetch(`/api/store/combo-detalhe?id=${combo.id}&loja_id=${lojaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setPassos(data.passos as StoreComboPasso[]);
      })
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, combo?.id, lojaId]);

  if (!combo) return null;

  function totalSelecionado(passoId: number): number {
    return Object.values(selecoes[passoId] ?? {}).reduce((s, q) => s + q, 0);
  }

  function alterarQty(passo: StoreComboPasso, opcaoId: number, delta: number) {
    setSelecoes((atual) => {
      const atualPasso = atual[passo.id] ?? {};
      const qtyAtual = atualPasso[opcaoId] ?? 0;
      const novaQty = Math.max(0, qtyAtual + delta);
      const totalAtual = Object.values(atualPasso).reduce((s, q) => s + q, 0);
      const max = passo.max_itens || 0;
      if (delta > 0 && max > 0 && totalAtual >= max) return atual;
      if (delta > 0 && passo.permite_repetir !== 1 && qtyAtual >= 1) return atual;
      return { ...atual, [passo.id]: { ...atualPasso, [opcaoId]: novaQty } };
    });
  }

  const passosFaltando = passos.filter((p) => {
    if (p.obrigatorio !== 1) return false;
    const min = Math.max(1, p.min_itens || 1);
    return totalSelecionado(p.id) < min;
  });
  const podeAdicionar = !carregando && passosFaltando.length === 0;

  function adicionar() {
    if (!combo || !podeAdicionar) return;
    const combosels = passos.flatMap((p) => {
      const sel = selecoes[p.id] ?? {};
      return p.opcoes
        .filter((o) => (sel[o.id] ?? 0) > 0)
        .map((o) => ({ id: o.id, nome: o.nome, qtd: sel[o.id] }));
    });
    const comboLines = combosels.map((s) => s.nome + (s.qtd > 1 ? ` x${s.qtd}` : "")).join("\n");
    const obsFinal = combosels.length ? `[combo]\n${comboLines}${obs ? `\n${obs}` : ""}` : obs;

    onAdicionar({
      id: combo.id,
      tipo: "combo",
      nome: combo.nome,
      precoUnit: combo.preco_final,
      qtd,
      obs: obsFinal,
      combosels,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="h-44 w-full shrink-0 bg-muted">
            {combo.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={combo.imagem} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Layers size={28} />
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <DialogTitle className="text-base">{combo.nome}</DialogTitle>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                Combo
              </span>
            </div>
            {combo.descricao && <p className="mt-1 text-sm text-muted-foreground">{combo.descricao}</p>}
            <div className="mt-2">
              {combo.em_promo ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">{formatarPreco(combo.preco_base)}</span>
                  <span className="text-base font-semibold text-foreground">{formatarPreco(combo.preco_final)}</span>
                </div>
              ) : (
                <span className="text-base font-semibold text-foreground">{formatarPreco(combo.preco_final)}</span>
              )}
            </div>

            {carregando ? (
              <p className="mt-4 text-sm text-muted-foreground">Carregando opcoes...</p>
            ) : (
              <div className="mt-4 space-y-5">
                {passos.map((passo) => {
                  const total = totalSelecionado(passo.id);
                  const min = passo.min_itens || 0;
                  const max = passo.max_itens || 0;
                  let sub = "";
                  if (min > 0 && max > 0 && min === max) sub = `Escolha exatamente ${min} ${min === 1 ? "opcao" : "opcoes"}`;
                  else if (min > 0 && max > 0) sub = `Escolha entre ${min} e ${max} opcoes`;
                  else if (min > 0) sub = `Escolha ao menos ${min} ${min === 1 ? "opcao" : "opcoes"}`;
                  else if (max > 0) sub = `Escolha ate ${max} ${max === 1 ? "opcao" : "opcoes"}`;
                  if (passo.permite_repetir !== 1) sub += sub ? ". Opcoes nao podem ser repetidas" : "Opcoes nao podem ser repetidas";

                  return (
                    <div key={passo.id}>
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{passo.nome}</h3>
                        {passo.obrigatorio === 1 && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            Obrigatorio
                          </span>
                        )}
                      </div>
                      {sub && <p className="mb-2 text-xs text-muted-foreground">{sub}</p>}
                      <div className="space-y-1.5">
                        {passo.opcoes.map((opc) => {
                          const qty = selecoes[passo.id]?.[opc.id] ?? 0;
                          const podeAdd = !opc.esgotado && (max === 0 || total < max) && (passo.permite_repetir === 1 || qty === 0);
                          return (
                            <div
                              key={opc.id}
                              className={`flex items-center gap-2.5 rounded-lg border p-2.5 ${
                                opc.esgotado ? "opacity-50" : "border-border"
                              }`}
                            >
                              <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                                {opc.imagem ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={opc.imagem} alt="" className="size-full object-cover" />
                                ) : (
                                  <div className="flex size-full items-center justify-center text-muted-foreground">
                                    <ImageIcon size={14} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm">{opc.nome}</div>
                                <div className="text-xs text-muted-foreground">
                                  {opc.esgotado ? "Esgotado" : "Incluido no valor do combo"}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  disabled={qty <= 0}
                                  onClick={() => alterarQty(passo, opc.id, -1)}
                                >
                                  <Minus size={12} />
                                </Button>
                                <span className="w-4 text-center text-sm">{qty}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  disabled={!podeAdd}
                                  onClick={() => alterarQty(passo, opc.id, 1)}
                                >
                                  <Plus size={12} />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Observacoes</label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:border-ring"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="icon" disabled={qtd <= 1} onClick={() => setQtd((q) => Math.max(1, q - 1))}>
                  <Minus size={14} />
                </Button>
                <span className="w-6 text-center text-sm font-medium">{qtd}</span>
                <Button type="button" variant="outline" size="icon" onClick={() => setQtd((q) => q + 1)}>
                  <Plus size={14} />
                </Button>
              </div>
              <Button type="button" disabled={!podeAdicionar} onClick={adicionar}>
                {passosFaltando.length > 0
                  ? `Selecione "${passosFaltando[0].nome}"`
                  : `Adicionar ${formatarPreco(combo.preco_final * qtd)}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
