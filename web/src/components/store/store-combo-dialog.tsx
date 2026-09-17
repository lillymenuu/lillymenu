"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, ImageIcon, Layers, Minus, Plus, Shrink, X } from "lucide-react";
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
  const [imagemAmpliada, setImagemAmpliada] = useState(false);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const passoRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const ultimoPassoAlteradoRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !combo) return;
    setQtd(1);
    setObs("");
    setImagemAmpliada(false);
    setAspectRatio(null);
    setPassos([]);
    setSelecoes({});
    setCarregando(true);
    setErroCarregar(false);
    fetch(`/api/store/combo-detalhe?id=${combo.id}&loja_id=${lojaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setPassos(data.passos as StoreComboPasso[]);
        else setErroCarregar(true);
      })
      .catch(() => setErroCarregar(true))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, combo?.id, lojaId]);

  /* Quantas unidades do combo inteiro dao pra montar com o estoque das
     opcoes ja escolhidas (ex.: se so tem 1 unidade do item selecionado,
     nao da pra pedir 2 combos com ele dentro). Sem selecao ainda = sem
     limite conhecido. Precisa ficar ANTES do "if (!combo) return null"
     abaixo — hooks nao podem vir depois de um return condicional, senao
     a contagem de hooks muda entre o render com combo=null e o render
     seguinte, e o React quebra (erro #310). */
  const maxCombosPorEstoque = useMemo(() => {
    let limite: number | null = null;
    for (const passo of passos) {
      const sel = selecoes[passo.id] ?? {};
      for (const opc of passo.opcoes) {
        const qtdSelecionada = sel[opc.id] ?? 0;
        if (qtdSelecionada > 0) {
          const limiteOpcao = Math.floor(opc.estoque / qtdSelecionada);
          limite = limite === null ? limiteOpcao : Math.min(limite, limiteOpcao);
        }
      }
    }
    return limite;
  }, [passos, selecoes]);

  useEffect(() => {
    if (maxCombosPorEstoque !== null && qtd > maxCombosPorEstoque) {
      setQtd(Math.max(1, maxCombosPorEstoque));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxCombosPorEstoque]);

  /* Ao satisfazer um passo (ex.: escolher o empadao), rola suavemente ate
     o proximo passo ainda pendente — mesmo comportamento do cardapio
     legado (_rolarProximoPassoCombo em loja.js), especialmente util no
     celular onde o combo tem varios passos empilhados verticalmente. */
  useEffect(() => {
    const passoId = ultimoPassoAlteradoRef.current;
    if (passoId === null) return;
    ultimoPassoAlteradoRef.current = null;
    const idx = passos.findIndex((p) => p.id === passoId);
    if (idx === -1) return;
    const passoAtual = passos[idx];
    const totalAtual = Object.values(selecoes[passoAtual.id] ?? {}).reduce((s, q) => s + q, 0);
    const satisfeito =
      passoAtual.obrigatorio === 1
        ? totalAtual >= Math.max(1, passoAtual.min_itens || 1)
        : (passoAtual.max_itens || 0) > 0 && totalAtual >= (passoAtual.max_itens || 0);
    if (!satisfeito) return;
    for (let i = idx + 1; i < passos.length; i++) {
      const proximo = passos[i];
      const totalProximo = Object.values(selecoes[proximo.id] ?? {}).reduce((s, q) => s + q, 0);
      const proximoSatisfeito =
        proximo.obrigatorio === 1
          ? totalProximo >= Math.max(1, proximo.min_itens || 1)
          : (proximo.max_itens || 0) > 0 && totalProximo >= (proximo.max_itens || 0);
      if (!proximoSatisfeito) {
        passoRefs.current[proximo.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecoes]);

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
  const podeAdicionar = !carregando && !erroCarregar && passosFaltando.length === 0;

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
      <QtyStepper value={qtd} onChange={setQtd} max={maxCombosPorEstoque ?? undefined} />
      <button
        type="button"
        disabled={!podeAdicionar}
        onClick={adicionar}
        className="flex-1 rounded-[10px] py-3.5 text-[.9rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
        style={{ background: podeAdicionar ? brown : "#c0a88a" }}
      >
        {passosFaltando.length > 0 ? `Selecione "${passosFaltando[0].nome}"` : `Adicionar ${formatarPreco(combo.preco_final * qtd)}`}
      </button>
    </div>
  );

  return (
    <StoreSheet open={open} onOpenChange={onOpenChange} footer={footer} maxWidth={613}>
      <div className="p-4">
        <div
          className={`group relative mb-3 w-full overflow-hidden rounded-xl bg-neutral-100 transition-all duration-300 ease-out ${
            imagemAmpliada ? "" : "h-[190px]"
          }`}
          style={imagemAmpliada ? { aspectRatio: aspectRatio ?? 4 / 3 } : undefined}
        >
          {combo.imagem ? (
            <>
              <button
                type="button"
                onClick={() => setImagemAmpliada((v) => !v)}
                className={`block size-full ${imagemAmpliada ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={combo.imagem}
                  alt=""
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) setAspectRatio(img.naturalWidth / img.naturalHeight);
                  }}
                  className="size-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={() => setImagemAmpliada((v) => !v)}
                className="absolute right-2 bottom-2 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[.72rem] font-semibold text-white"
              >
                {imagemAmpliada ? <Shrink size={12} /> : <Expand size={12} />}
                {imagemAmpliada ? "Recolher" : "Ver maior"}
              </button>
            </>
          ) : (
            <div className="flex size-full items-center justify-center text-neutral-300">
              <Layers size={32} />
            </div>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-neutral-600"
          >
            <X size={14} />
          </button>
        </div>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-[.95rem] font-bold text-neutral-900">{combo.nome}</h2>
          <span className="rounded bg-amber-500 px-1.5 py-px text-[.6rem] font-bold tracking-wide text-white uppercase">Combo</span>
        </div>
        {combo.descricao && <p className="mb-2.5 text-[.76rem] leading-relaxed text-neutral-500">{combo.descricao}</p>}
        <div className="mb-4">
          {combo.em_promo ? (
            <div className="flex items-center gap-2">
              <span className="text-[.8rem] text-neutral-400 line-through">{formatarPreco(combo.preco_base)}</span>
              <span className="text-[1rem] font-bold text-neutral-900">{formatarPreco(combo.preco_final)}</span>
            </div>
          ) : (
            <span className="text-[1rem] font-bold text-neutral-900">{formatarPreco(combo.preco_final)}</span>
          )}
        </div>

        {carregando ? (
          <p className="text-[.86rem] text-neutral-500">Carregando opcoes...</p>
        ) : erroCarregar ? (
          <p className="text-[.86rem] text-red-600">Nao foi possivel carregar as opcoes do combo. Feche e tente novamente.</p>
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
                <div
                  key={passo.id}
                  ref={(el) => {
                    passoRefs.current[passo.id] = el;
                  }}
                >
                  <div className="mb-1 rounded-[10px] bg-neutral-100 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[.8rem] font-bold text-neutral-900">
                      {passo.nome}
                      {passo.obrigatorio === 1 && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[.62rem] font-bold text-amber-700">Obrigatorio</span>
                      )}
                    </div>
                    {sub && <p className="mt-0.5 text-[.68rem] text-neutral-500">{sub}</p>}
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
                          className={`flex items-center gap-2.5 border-b border-neutral-100 py-2 last:border-0 ${opc.esgotado ? "opacity-55" : ""}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[.8rem] leading-tight text-neutral-900">{opc.nome}</div>
                            <div className="mt-0.5 text-[.68rem] text-neutral-400">
                              {opc.esgotado ? "Esgotado" : "Incluido no valor do combo"}
                            </div>
                          </div>
                          <div className="size-[64px] shrink-0 overflow-hidden rounded-xl bg-neutral-100">
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
                            <span className="min-w-[22px] px-0.5 text-center text-[.78rem] font-medium text-neutral-900">{qty}</span>
                            <button
                              type="button"
                              disabled={!podeAdd}
                              onClick={() => {
                                ultimoPassoAlteradoRef.current = passo.id;
                                alterarQty(passo, opc.id, opc.estoque, 1);
                              }}
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
          <label className="mb-1.5 block text-[.8rem] font-bold text-neutral-900">Alguma observacao?</label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Observacoes do cliente"
            rows={2}
            className="w-full resize-none rounded-[10px] border-[1.5px] border-neutral-200 p-2.5 text-[.8rem] outline-none"
          />
        </div>
      </div>
    </StoreSheet>
  );
}
