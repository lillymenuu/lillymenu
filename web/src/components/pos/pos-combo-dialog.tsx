"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Layers, Minus, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/components/ordermanager/constants";
import { toast } from "sonner";
import { cn } from "cn";
import type { PosCartItem, PosCombo, PosComboDetalheResposta, PosComboPasso } from "@/lib/pos";

type Selecoes = Record<number, Record<number, number>>; // passoId -> opcaoId -> qtd

function pluralOpcoes(n: number) {
  return n === 1 ? "1 opção" : `${n} opções`;
}

/** Texto de ajuda do passo, derivado de min/max (ex.: "Escolha 1 opção.", "Escolha até 3 opções."). */
function dicaDoPasso(passo: PosComboPasso) {
  const { min_itens: min, max_itens: max } = passo;
  if (max > 0 && min >= max) return `Escolha ${pluralOpcoes(max)}.`;
  if (max > 0 && min > 0) return `Escolha de ${min} a ${max} opções.`;
  if (max > 0) return `Escolha até ${pluralOpcoes(max)}.`;
  if (min > 0) return `Escolha no mínimo ${pluralOpcoes(min)}.`;
  return "Escolha as opções que quiser.";
}

function avisarEstoque() {
  toast.error("Quantidade do item indisponível no momento!");
}

/** Observacao livre do cliente = o que sobra em `observacoes` depois de "[combo]" e das linhas de composicao. */
function obsDoItem(item: PosCartItem) {
  const n = item.combosels?.length ?? 0;
  return item.observacoes
    .split("\n")
    .slice(1 + n)
    .join("\n");
}

/** Reconstroi o que estava marcado no modal a partir das opcoes guardadas no item (passoId, ou o 1o passo que tiver a opcao). */
function selecoesDoItem(passos: PosComboPasso[], combosels: NonNullable<PosCartItem["combosels"]>): Selecoes {
  const resultado: Selecoes = {};
  for (const sel of combosels) {
    const passo =
      passos.find((p) => p.id === sel.passoId && p.opcoes.some((o) => o.id === sel.id)) ??
      passos.find((p) => p.opcoes.some((o) => o.id === sel.id));
    if (!passo) continue;
    resultado[passo.id] = { ...(resultado[passo.id] ?? {}), [sel.id]: sel.qtd };
  }
  return resultado;
}

export function PosComboDialog({
  combo,
  itemEditando,
  onOpenChange,
  onAdicionar,
  onSalvar,
}: {
  combo: PosCombo | null;
  /** Item do carrinho sendo editado: reabre este mesmo modal ja preenchido pra trocar as opcoes. */
  itemEditando?: PosCartItem | null;
  onOpenChange: (v: boolean) => void;
  onAdicionar: (item: Omit<PosCartItem, "rowKey">) => void;
  onSalvar?: (rowKey: string, item: Omit<PosCartItem, "rowKey">) => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const [passos, setPassos] = useState<PosComboPasso[]>([]);
  const [descricao, setDescricao] = useState("");
  const [selecoes, setSelecoes] = useState<Selecoes>({});
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (!combo) return;
    setCarregando(true);
    setPassos([]);
    setDescricao("");
    setSelecoes({});
    setQtd(itemEditando?.qtd ?? 1);
    setObs(itemEditando ? obsDoItem(itemEditando) : "");
    fetch(`/api/pos/combo-detalhe?id=${combo.id}`)
      .then((r) => r.json())
      .then((data: PosComboDetalheResposta) => {
        if (data.ok) {
          const lista = data.passos ?? [];
          setPassos(lista);
          setDescricao(data.combo?.descricao ?? "");
          if (itemEditando?.combosels) setSelecoes(selecoesDoItem(lista, itemEditando.combosels));
        }
      })
      .catch(() => setPassos([]))
      .finally(() => setCarregando(false));
  }, [combo, itemEditando]);

  const totalPorPasso = useMemo(() => {
    const map: Record<number, number> = {};
    for (const passo of passos) {
      map[passo.id] = Object.values(selecoes[passo.id] ?? {}).reduce((s, q) => s + q, 0);
    }
    return map;
  }, [passos, selecoes]);

  const somaOpcoes = useMemo(() => {
    let total = 0;
    for (const passo of passos) {
      for (const opcao of passo.opcoes) {
        total += (selecoes[passo.id]?.[opcao.id] ?? 0) * opcao.preco;
      }
    }
    return total;
  }, [passos, selecoes]);

  /* Quantos combos inteiros o estoque comporta: nos passos ja escolhidos vale a opcao marcada; nos
     obrigatorios ainda sem escolha, vale a melhor opcao disponivel (senao o "+" ficaria livre ate escolher). */
  const maxQtd = useMemo(() => {
    let limite = Infinity;
    for (const passo of passos) {
      const escolhidas = passo.opcoes.filter((o) => (selecoes[passo.id]?.[o.id] ?? 0) > 0);
      if (escolhidas.length > 0) {
        for (const opcao of escolhidas) {
          if (opcao.estoque !== null) limite = Math.min(limite, Math.floor(opcao.estoque / (selecoes[passo.id]?.[opcao.id] ?? 1)));
        }
      } else if (passo.obrigatorio) {
        const estoques = passo.opcoes.filter((o) => !o.esgotado && o.estoque !== null).map((o) => o.estoque as number);
        if (estoques.length > 0 && estoques.length === passo.opcoes.filter((o) => !o.esgotado).length) {
          limite = Math.min(limite, Math.max(...estoques));
        }
      }
    }
    return Math.max(1, limite);
  }, [passos, selecoes]);

  const valido = passos.every((p) => {
    const q = totalPorPasso[p.id] ?? 0;
    if (p.obrigatorio && q < Math.max(1, p.min_itens)) return false;
    if (p.min_itens > 0 && q < p.min_itens) return false;
    if (p.max_itens > 0 && q > p.max_itens) return false;
    return true;
  });

  function alterarQtdOpcao(passo: PosComboPasso, opcaoId: number, delta: number) {
    setSelecoes((prev) => {
      const atualPasso = { ...(prev[passo.id] ?? {}) };
      const atual = atualPasso[opcaoId] ?? 0;
      let novo = Math.max(0, atual + delta);
      if (!passo.permite_repetir && novo > 1) novo = 1;

      /* Passo de escolha unica: escolher outra opcao troca a anterior em vez de travar. */
      if (delta > 0 && passo.max_itens === 1) {
        return { ...prev, [passo.id]: { [opcaoId]: 1 } };
      }

      const somaOutras = Object.entries(atualPasso).reduce((s, [id, q]) => (Number(id) === opcaoId ? s : s + q), 0);
      if (passo.max_itens > 0 && somaOutras + novo > passo.max_itens) return prev;

      if (novo === 0) delete atualPasso[opcaoId];
      else atualPasso[opcaoId] = novo;
      return { ...prev, [passo.id]: atualPasso };
    });
  }

  if (!combo) return null;

  const emPromo = combo.preco_promocional !== null;
  const precoFixo = combo.preco_promocional ?? combo.preco;
  /* "por_combo": preco fechado (com promo, se houver); "por_item": soma dos itens escolhidos. */
  const precoUnit = combo.tipo_preco === "por_item" ? somaOpcoes : precoFixo;
  const qtdEfetiva = Math.min(qtd, maxQtd);
  const estoqueCombos = maxQtd;

  function confirmar() {
    if (!combo || !valido) return;
    const combosels = passos.flatMap((p) =>
      p.opcoes
        .filter((o) => (selecoes[p.id]?.[o.id] ?? 0) > 0)
        .map((o) => ({ id: o.id, nome: o.nome, qtd: selecoes[p.id]?.[o.id] ?? 0, passoId: p.id }))
    );
    const linhas = combosels.map((c) => `${c.qtd}x ${c.nome}`).join("\n");
    const obsTexto = obs.trim();
    const item = {
      produtoId: null,
      comboId: combo.id,
      nome: combo.nome,
      qtd: qtdEfetiva,
      preco: precoUnit,
      observacoes: `[combo]\n${linhas}${obsTexto ? `\n${obsTexto}` : ""}`,
      usarPontos: false,
      combosels,
      imagem: combo.imagem,
      /* Limite de combos inteiros que o estoque comporta, guardado no item pra travar a quantidade depois. */
      estoque: Number.isFinite(estoqueCombos) ? estoqueCombos : undefined,
    };
    if (itemEditando && onSalvar) onSalvar(itemEditando.rowKey, item);
    else onAdicionar(item);
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] w-[520px] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[520px]"
      >
        {/* Cabecalho */}
        <div className="flex shrink-0 items-start gap-3 px-4 pt-4 pb-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            {combo.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={combo.imagem} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground/40">
                <Layers className="size-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base leading-tight font-semibold">{combo.nome}</DialogTitle>
            {descricao && <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">{descricao}</p>}
            <div className="mt-1 flex items-baseline gap-1.5 text-sm">
              {combo.tipo_preco === "por_item" ? (
                <span className="font-semibold">Soma dos itens escolhidos</span>
              ) : (
                <>
                  {emPromo && <span className="text-xs text-muted-foreground line-through">{formatBRL(combo.preco)}</span>}
                  <span className="font-semibold">{formatBRL(precoFixo)}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Passos */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-3">
          {carregando ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando combo...</div>
          ) : (
            passos.map((passo) => {
              const total = totalPorPasso[passo.id] ?? 0;
              const cheio = passo.max_itens > 0 && total >= passo.max_itens;
              const faltando = passo.obrigatorio && total < Math.max(1, passo.min_itens);
              return (
                <section key={passo.id} className="overflow-hidden rounded-xl border">
                  <div className="flex items-start justify-between gap-3 bg-muted/60 px-4 py-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{passo.nome}</h3>
                      {passo.descricao && <p className="mt-0.5 text-xs text-muted-foreground">{passo.descricao}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{dicaDoPasso(passo)}</p>
                    </div>
                    {passo.obrigatorio && (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          faltando ? "bg-destructive/10 text-destructive" : "bg-emerald-500/15 text-emerald-700"
                        )}
                      >
                        {faltando ? "Obrigatório" : "Ok"}
                      </span>
                    )}
                  </div>

                  <div className="divide-y bg-background">
                    {passo.opcoes.map((opcao) => {
                      const q = selecoes[passo.id]?.[opcao.id] ?? 0;
                      const limiteEstoque = opcao.estoque !== null && (q + 1) * qtdEfetiva > opcao.estoque;
                      const tentarAdd = () => {
                        if (podeAdd) alterarQtdOpcao(passo, opcao.id, 1);
                        else if (!opcao.esgotado && limiteEstoque) avisarEstoque();
                      };
                      const podeAdd = !opcao.esgotado && !limiteEstoque && (passo.max_itens === 1 || !cheio) && (passo.permite_repetir || q === 0);
                      return (
                        <div
                          key={opcao.id}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 transition-colors",
                            opcao.esgotado && "opacity-50",
                            q > 0 && "bg-primary/5"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm leading-tight font-medium">{opcao.nome}</div>
                            {opcao.esgotado ? (
                              <div className="mt-0.5 text-xs text-destructive">Esgotado</div>
                            ) : combo.tipo_preco === "por_item" && opcao.preco > 0 ? (
                              <div className="mt-0.5 text-xs text-muted-foreground">{formatBRL(opcao.preco)}</div>
                            ) : null}
                          </div>

                          <div className="size-[72px] shrink-0 overflow-hidden rounded-xl bg-muted">
                            {opcao.imagem ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={opcao.imagem} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="flex size-full items-center justify-center text-muted-foreground/40">
                                <ImageIcon className="size-5" />
                              </div>
                            )}
                          </div>

                          {q === 0 ? (
                            <button
                              type="button"
                              aria-disabled={!podeAdd}
                              onClick={tentarAdd}
                              aria-label={`Adicionar ${opcao.nome}`}
                              className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95", !podeAdd && "cursor-not-allowed opacity-40")}
                            >
                              <Plus className="size-4" />
                            </button>
                          ) : (
                            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-primary/10 p-1">
                              <button
                                type="button"
                                onClick={() => alterarQtdOpcao(passo, opcao.id, -1)}
                                aria-label={`Remover ${opcao.nome}`}
                                className="flex size-8 items-center justify-center rounded-lg bg-background text-foreground shadow-sm transition-transform active:scale-95"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <span className="w-5 text-center text-sm font-semibold tabular-nums">{q}</span>
                              <button
                                type="button"
                                aria-disabled={!podeAdd}
                                onClick={tentarAdd}
                                aria-label={`Adicionar mais ${opcao.nome}`}
                                className={cn("flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95", !podeAdd && "cursor-not-allowed opacity-40")}
                              >
                                <Plus className="size-3.5" />
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

        {/* Rodape: observacoes, quantidade e confirmar */}
        <div className="shrink-0 space-y-2 border-t bg-background px-4 pt-3 pb-4">
          <label className="block rounded-xl bg-muted/60 px-3 py-2">
            <span className="block text-[11px] text-muted-foreground">Observações do cliente</span>
            <input
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex: retirar cebola, molho à parte..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </label>
          <p className="text-[11px] text-muted-foreground/80">Quantidade mínima 1x</p>
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-1">
              <button
                type="button"
                disabled={qtd <= 1}
                onClick={() => setQtd((q) => Math.max(1, q - 1))}
                aria-label="Diminuir quantidade"
                className="flex size-9 items-center justify-center rounded-full bg-background shadow-sm transition-transform active:scale-95 disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">{qtdEfetiva}</span>
              <button
                type="button"
                aria-disabled={qtdEfetiva >= maxQtd}
                onClick={() => (qtdEfetiva >= maxQtd ? avisarEstoque() : setQtd((q) => Math.min(maxQtd, q + 1)))}
                aria-label="Aumentar quantidade"
                className={cn("flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95", qtdEfetiva >= maxQtd && "opacity-40")}
              >
                <Plus className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={confirmar}
              disabled={carregando || !valido}
              className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {itemEditando ? "Salvar" : "Adicionar"} {formatBRL(precoUnit * qtdEfetiva)}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
