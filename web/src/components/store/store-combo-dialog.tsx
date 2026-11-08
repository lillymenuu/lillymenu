"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Expand, ImageIcon, Layers, Minus, Plus, Shrink, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StoreSheet } from "@/components/store/store-sheet";
import { QtyStepper } from "@/components/store/qty-stepper";
import { useStoreTheme } from "@/components/store/store-theme";
import { avisarEstoqueIndisponivel } from "@/components/store/toast-estoque";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCartItem, StoreCombo, StoreComboPasso } from "@/lib/store/types";

type Selecao = Record<number, number>;

/* Computador (>= 940px): modal horizontal de duas colunas (igual ao do balcao); celular: sheet de sempre. */
const MQ_DESKTOP = "(min-width: 940px)";
function assinarDesktop(cb: () => void) {
  const mq = window.matchMedia(MQ_DESKTOP);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useDesktop() {
  return useSyncExternalStore(assinarDesktop, () => window.matchMedia(MQ_DESKTOP).matches, () => false);
}

function textoRegraPasso(passo: StoreComboPasso) {
  const min = passo.min_itens || 0;
  const max = passo.max_itens || 0;
  let sub = "";
  if (min > 0 && max > 0 && min === max) sub = `Escolha exatamente ${min} ${min === 1 ? "opção" : "opções"}`;
  else if (min > 0 && max > 0) sub = `Escolha entre ${min} e ${max} opções`;
  else if (min > 0) sub = `Escolha ao menos ${min} ${min === 1 ? "opção" : "opções"}`;
  else if (max > 0) sub = `Escolha até ${max} ${max === 1 ? "opção" : "opções"}`;
  return sub ? `${sub}.` : "";
}

export function StoreComboDialog({
  combo,
  lojaId,
  consumoCarrinho,
  open,
  onOpenChange,
  onAdicionar,
  somenteVisualizar = false,
}: {
  combo: StoreCombo | null;
  lojaId: number;
  /** Unidades por produto que o carrinho ja consome — saem do estoque das opcoes. */
  consumoCarrinho?: Record<number, number>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdicionar: (item: Omit<StoreCartItem, "key">) => void;
  /** Loja com \"Receber pedidos\" desligado: mostra o combo e o valor, sem adicionar ao carrinho. */
  somenteVisualizar?: boolean;
}) {
  const { brown } = useStoreTheme();
  const desktop = useDesktop();
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const [passosBrutos, setPassos] = useState<StoreComboPasso[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [selecoes, setSelecoes] = useState<Record<number, Selecao>>({});
  /* Comeca ja expandida (foto inteira, sem cortar) tanto no desktop quanto no mobile. */
  const [imagemAmpliada, setImagemAmpliada] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const passoRefs = useRef<Record<number, HTMLElement | null>>({});
  const ultimoPassoAlteradoRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !combo) return;
    setQtd(1);
    setObs("");
    setImagemAmpliada(true);
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

  /* Estoque das opcoes ja descontado do que o carrinho consome (senao da pra pedir de novo o que acabou). */
  const passos = useMemo(
    () =>
      passosBrutos.map((p) => ({
        ...p,
        opcoes: p.opcoes.map((o) => {
          const estoque = Math.max(0, o.estoque - (consumoCarrinho?.[o.id] ?? 0));
          return { ...o, estoque, esgotado: o.esgotado || estoque <= 0 };
        }),
      })),
    [passosBrutos, consumoCarrinho]
  );

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
      return p.opcoes
        .filter((o) => (sel[o.id] ?? 0) > 0)
        .map((o) => ({ id: o.id, nome: o.nome, qtd: sel[o.id], passoNome: p.nome }));
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
      obsUsuario: obs.trim() || undefined,
      imagem: combo.imagem,
      estoqueMax: maxCombosPorEstoque ?? undefined,
      combosels,
    });
    onOpenChange(false);
  }

  const footer = somenteVisualizar ? (
    <div className="flex justify-end">
      <div className="rounded-xl bg-neutral-100 px-4 py-3 text-[.9rem] font-medium text-neutral-900">
        {formatarPreco(combo.preco_final)}
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-3">
      <QtyStepper
        value={qtd}
        onChange={setQtd}
        max={maxCombosPorEstoque ?? undefined}
        onMaxAtingido={avisarEstoqueIndisponivel}
      />
      <button
        type="button"
        disabled={!podeAdicionar}
        onClick={adicionar}
        className="flex-1 rounded-full py-3.5 text-[.9rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
        style={{ background: podeAdicionar ? brown : "#c0a88a" }}
      >
        {passosFaltando.length > 0 ? `Selecione "${passosFaltando[0].nome}"` : `Adicionar ${formatarPreco(combo.preco_final * qtd)}`}
      </button>
    </div>
  );

  function cliqueMais(passo: StoreComboPasso, opc: StoreComboPasso["opcoes"][number], podeAdd: boolean, qty: number) {
    if (!podeAdd) {
      if (!opc.esgotado && qty >= opc.estoque) avisarEstoqueIndisponivel();
      return;
    }
    ultimoPassoAlteradoRef.current = passo.id;
    alterarQty(passo, opc.id, opc.estoque, 1);
  }

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[min(650px,calc(100dvh-24px))] w-[1040px]! max-w-[calc(100%-24px)]! gap-0 overflow-hidden rounded-[24px] bg-white p-0 shadow-[0_24px_60px_rgba(0,0,0,.3)]"
        >
          <DialogTitle className="sr-only">{combo.nome}</DialogTitle>

          {/* Coluna fixa: foto, nome, preco e descricao */}
          <div className="flex w-[320px] shrink-0 flex-col overflow-y-auto p-6">
            <div className="aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
              {combo.imagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={combo.imagem} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-neutral-300">
                  <Layers size={36} />
                </div>
              )}
            </div>
            <h2 className="mt-4 text-[1rem] leading-tight font-bold text-neutral-900">{combo.nome}</h2>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              {combo.em_promo && <span className="text-[.86rem] text-neutral-400 line-through">{formatarPreco(combo.preco_base)}</span>}
              <span className="text-[1rem] font-bold" style={{ color: brown }}>
                {formatarPreco(combo.preco_final)}
              </span>
            </div>
            {combo.descricao && <p className="mt-2 text-[.86rem] leading-relaxed text-neutral-500">{combo.descricao}</p>}
          </div>

          {/* Coluna rolavel: passos do combo e rodape */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 justify-end px-4 pt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Fechar"
                className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-3">
              {carregando ? (
                <p className="py-10 text-center text-[.86rem] text-neutral-500">Carregando opções...</p>
              ) : erroCarregar ? (
                <p className="py-10 text-center text-[.86rem] text-red-600">Não foi possível carregar as opções do combo. Feche e tente novamente.</p>
              ) : (
                passos.map((passo) => {
                  const total = totalSelecionado(passo.id);
                  const max = passo.max_itens || 0;
                  const faltando = passosFaltando.some((p) => p.id === passo.id);
                  return (
                    <section
                      key={passo.id}
                      ref={(el) => {
                        passoRefs.current[passo.id] = el;
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[.9rem] font-bold text-neutral-900">{passo.nome}</h3>
                        {passo.obrigatorio === 1 && (
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[.68rem] font-semibold ${
                              faltando ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {faltando ? "Obrigatório" : "Ok"}
                          </span>
                        )}
                      </div>
                      {textoRegraPasso(passo) && <p className="mt-0.5 mb-2.5 text-[.74rem] text-neutral-500">{textoRegraPasso(passo)}</p>}

                      <div className="grid grid-cols-2 gap-3">
                        {passo.opcoes.map((opc) => {
                          const qty = selecoes[passo.id]?.[opc.id] ?? 0;
                          const podeAdd =
                            !opc.esgotado && qty < opc.estoque && (max === 0 || total < max) && (passo.permite_repetir === 1 || qty === 0);
                          const ativo = qty > 0;
                          return (
                            <div
                              key={opc.id}
                              className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                                ativo ? "" : "border-neutral-200"
                              } ${opc.esgotado ? "opacity-55" : ""}`}
                              style={ativo ? { borderColor: `${brown}55`, background: `${brown}0d` } : undefined}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="line-clamp-2 text-[.84rem] leading-tight text-neutral-900">{opc.nome}</div>
                                {opc.esgotado && <div className="mt-0.5 text-[.7rem] text-neutral-400">Esgotado</div>}
                              </div>
                              <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                                {opc.imagem ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={opc.imagem} alt="" className="size-full object-cover" />
                                ) : (
                                  <div className="flex size-full items-center justify-center text-neutral-300">
                                    <ImageIcon size={16} />
                                  </div>
                                )}
                              </div>
                              {!somenteVisualizar && (
                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={qty <= 0}
                                    onClick={() => alterarQty(passo, opc.id, opc.estoque, -1)}
                                    aria-label={`Remover ${opc.nome}`}
                                    className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 disabled:text-neutral-300"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <span className="w-5 text-center text-[.84rem] font-semibold tabular-nums text-neutral-900">{qty}</span>
                                  <button
                                    type="button"
                                    aria-disabled={!podeAdd}
                                    onClick={() => cliqueMais(passo, opc, podeAdd, qty)}
                                    aria-label={`Adicionar ${opc.nome}`}
                                    className="flex size-7 items-center justify-center rounded-full text-white transition-opacity"
                                    style={{ background: brown, opacity: podeAdd ? 1 : 0.4 }}
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })
              )}
            </div>

            <div className="shrink-0 space-y-2.5 px-4 pt-2 pb-4">
              {!somenteVisualizar && (
                <label className="block">
                  <span className="mb-1 block text-[.78rem] font-semibold text-neutral-900">Observações do cliente</span>
                  <input
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    placeholder="Ex.: sem cebola, molho à parte..."
                    className="w-full rounded-full border-[1.5px] border-neutral-200 px-4 py-2.5 text-[.88rem] outline-none placeholder:text-neutral-400"
                  />
                </label>
              )}
              {footer}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <StoreSheet open={open} onOpenChange={onOpenChange} footer={footer} maxWidth={613}>
      <div className="p-4">
        <div
          className={`group relative mb-3 w-full overflow-hidden rounded-xl bg-neutral-100 sm:max-h-[280px] ${
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
              <span className="text-[1rem] font-bold text-emerald-600">{formatarPreco(combo.preco_final)}</span>
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
                              aria-disabled={!podeAdd}
                              onClick={() => {
                                if (!podeAdd) {
                                  if (!opc.esgotado && qty >= opc.estoque) avisarEstoqueIndisponivel();
                                  return;
                                }
                                ultimoPassoAlteradoRef.current = passo.id;
                                alterarQty(passo, opc.id, opc.estoque, 1);
                              }}
                              className={`flex size-7 items-center justify-center bg-white text-neutral-600 hover:bg-neutral-100 ${!podeAdd ? "text-neutral-300" : ""}`}
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
            className="w-full resize-none rounded-[10px] border-[1.5px] border-neutral-200 p-2.5 text-base outline-none"
          />
        </div>
      </div>
    </StoreSheet>
  );
}
