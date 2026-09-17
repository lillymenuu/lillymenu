"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Layers, Minus, Plus } from "lucide-react";
import { StoreSheet } from "@/components/store/store-sheet";
import { QtyStepper } from "@/components/store/qty-stepper";
import { useStoreTheme } from "@/components/store/store-theme";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCartItem, StoreCombo, StoreComboPasso } from "@/lib/store/types";

type Selecao = Record<number, number>;

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
  const { brown } = useStoreTheme();
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const [passos, setPassos] = useState<StoreComboPasso[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [selecoes, setSelecoes] = useState<Record<number, Selecao>>({});

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

  function alterarQty(passo: StoreComboPasso, opcaoId: number, estoqueOpcao: number, delta: number) {
    setSelecoes((atual) => {
      const atualPasso = atual[passo.id] ?? {};
      const qtyAtual = atualPasso[opcaoId] ?? 0;
      const novaQty = Math.max(0, qtyAtual + delta);
      const totalAtual = Object.values(atualPasso).reduce((s, q) => s + q, 0);
      const max = passo.max_itens || 0;
      if (delta > 0 && qtyAtual >= estoqueOpcao) return atual;
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
      return p.opcoes.filter((o) => (sel[o.id] ?? 0) > 0).map((o) => ({ id: o.id, nome: o.nome, qtd: sel[o.id] }));
    });
    const comboLines = combosels.map((s) => s.nome + (s.qtd > 1 ? ` x${s.qtd}` : "")).join("\n");
    const obsFinal = combosels.length ? `[combo]\n${comboLines}${obs ? `\n${obs}` : ""}` : obs;

    onAdicionar({ id: combo.id, tipo: "combo", nome: combo.nome, precoUnit: combo.preco_final, qtd, obs: obsFinal, combosels });
    onOpenChange(false);
  }

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <QtyStepper value={qtd} onChange={setQtd} />
      <button
        type="button"
        disabled={!podeAdicionar}
        onClick={adicionar}
        className="flex-1 rounded-[10px] py-3.5 text-[.9rem] font-bold text-white transition-opacity disabled:opacity-40"
        style={{ background: brown }}
      >
        {passosFaltando.length > 0 ? `Selecione "${passosFaltando[0].nome}"` : `Adicionar ${formatarPreco(combo.preco_final * qtd)}`}
      </button>
    </div>
  );

  return (
    <StoreSheet open={open} onOpenChange={onOpenChange} footer={footer} maxWidth={613}>
      <div className="p-4">
        <div className="mb-3 h-[190px] w-full overflow-hidden rounded-xl bg-neutral-100">
          {combo.imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={combo.imagem} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-neutral-300">
              <Layers size={32} />
            </div>
          )}
        </div>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-[1rem] font-bold text-neutral-900">{combo.nome}</h2>
          <span className="rounded bg-amber-500 px-1.5 py-px text-[.62rem] font-bold tracking-wide text-white uppercase">Combo</span>
        </div>
        {combo.descricao && <p className="mb-2.5 text-[.8rem] leading-relaxed text-neutral-500">{combo.descricao}</p>}
        <div className="mb-4">
          {combo.em_promo ? (
            <div className="flex items-center gap-2">
              <span className="text-[.85rem] text-neutral-400 line-through">{formatarPreco(combo.preco_base)}</span>
              <span className="text-[1.05rem] font-bold text-neutral-900">{formatarPreco(combo.preco_final)}</span>
            </div>
          ) : (
            <span className="text-[1.05rem] font-bold text-neutral-900">{formatarPreco(combo.preco_final)}</span>
          )}
        </div>

        {carregando ? (
          <p className="text-[.86rem] text-neutral-500">Carregando opcoes...</p>
        ) : (
          <div className="space-y-3">
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
                  <div className="mb-1 rounded-[10px] bg-neutral-100 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[.86rem] font-bold text-neutral-900">
                      {passo.nome}
                      {passo.obrigatorio === 1 && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[.67rem] font-bold text-amber-700">Obrigatorio</span>
                      )}
                    </div>
                    {sub && <p className="mt-0.5 text-[.72rem] text-neutral-500">{sub}</p>}
                  </div>
                  <div>
                    {passo.opcoes.map((opc) => {
                      const qty = selecoes[passo.id]?.[opc.id] ?? 0;
                      const podeAdd =
                        !opc.esgotado &&
                        qty < opc.estoque &&
                        (max === 0 || total < max) &&
                        (passo.permite_repetir === 1 || qty === 0);
                      return (
                        <div
                          key={opc.id}
                          className={`flex items-center gap-2.5 border-b border-neutral-100 py-2.5 last:border-0 ${opc.esgotado ? "opacity-55" : ""}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[.84rem] leading-tight text-neutral-900">{opc.nome}</div>
                            <div className="mt-0.5 text-[.71rem] text-neutral-400">
                              {opc.esgotado ? "Esgotado" : "Incluido no valor do combo"}
                            </div>
                          </div>
                          <div className="size-[72px] shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                            {opc.imagem ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={opc.imagem} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="flex size-full items-center justify-center text-neutral-300">
                                <ImageIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-neutral-200">
                            <button
                              type="button"
                              disabled={qty <= 0}
                              onClick={() => alterarQty(passo, opc.id, opc.estoque, -1)}
                              className="flex size-7 items-center justify-center bg-white text-neutral-600 hover:bg-neutral-100 disabled:text-neutral-300"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="min-w-[24px] px-0.5 text-center text-[.83rem] font-medium text-neutral-900">{qty}</span>
                            <button
                              type="button"
                              disabled={!podeAdd}
                              onClick={() => alterarQty(passo, opc.id, opc.estoque, 1)}
                              className="flex size-7 items-center justify-center bg-white text-neutral-600 hover:bg-neutral-100 disabled:text-neutral-300"
                            >
                              <Plus size={13} />
                            </button>
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

        <div className="mt-5">
          <label className="mb-1.5 block text-[.86rem] font-bold text-neutral-900">Alguma observacao?</label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Observacoes do cliente"
            rows={2}
            className="w-full resize-none rounded-[10px] border-[1.5px] border-neutral-200 p-2.5 text-[.84rem] outline-none"
          />
        </div>
      </div>
    </StoreSheet>
  );
}
