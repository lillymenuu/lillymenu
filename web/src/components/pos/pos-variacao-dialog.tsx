"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCartItem, PosGrupoOpcoes, PosProduto, PosVariacao, PosVariacoesResposta } from "@/lib/pos";

export function PosVariacaoDialog({
  produto,
  itemEditando,
  estoqueDisponivel,
  onOpenChange,
  onAdicionar,
  onSalvar,
}: {
  produto: PosProduto | null;
  itemEditando?: PosCartItem | null;
  /** Unidades que ainda cabem no carrinho (estoque menos tudo que ja esta nele, sem contar o item em edicao). */
  estoqueDisponivel: number;
  onOpenChange: (v: boolean) => void;
  onAdicionar: (item: Omit<PosCartItem, "rowKey">) => void;
  onSalvar?: (rowKey: string, item: Omit<PosCartItem, "rowKey">) => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const [variacoes, setVariacoes] = useState<PosVariacao[]>([]);
  const [variacaoTitulo, setVariacaoTitulo] = useState<string | null>(null);
  const [variacaoObrigatorio, setVariacaoObrigatorio] = useState(true);
  const [gruposOpcoes, setGruposOpcoes] = useState<PosGrupoOpcoes[]>([]);

  const [variacaoId, setVariacaoId] = useState<number | null>(null);
  const [selecoesGrupos, setSelecoesGrupos] = useState<Record<number, number[]>>({});
  const [qtd, setQtd] = useState(1);
  const [observacoes, setObservacoes] = useState("");
  /** Refs das secoes (variacao + cada grupo), na ordem exibida — usadas pra rolar ate a proxima quando uma secao e concluida. */
  const secaoRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!produto) return;
    setCarregando(true);
    setVariacoes([]);
    setVariacaoTitulo(null);
    setVariacaoObrigatorio(true);
    setGruposOpcoes([]);
    setVariacaoId(itemEditando?.variacaoId ?? null);
    setSelecoesGrupos(itemEditando?.selecoesGrupos ?? {});
    setQtd(itemEditando?.qtd ?? 1);
    setObservacoes(itemEditando?.observacoes ?? "");
    fetch(`/api/pos/produto-variacoes?id=${produto.id}`)
      .then((r) => r.json())
      .then((data: PosVariacoesResposta) => {
        if (data.ok) {
          const lista = data.variacoes ?? [];
          setVariacoes(lista);
          setVariacaoTitulo(data.variacao_titulo ?? null);
          setVariacaoObrigatorio(!!data.variacao_obrigatorio);
          setGruposOpcoes(data.grupos_opcoes ?? []);
          if (!itemEditando && lista.length > 0) setVariacaoId(lista[0].id);
        }
      })
      .catch(() => setVariacoes([]))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto, itemEditando]);

  if (!produto) return null;

  const variacaoSelecionada = variacoes.find((v) => v.id === variacaoId) ?? null;
  const precoBase = variacaoSelecionada ? (variacaoSelecionada.preco > 0 ? variacaoSelecionada.preco : produto.preco) : produto.preco;
  const gruposSelecionados = gruposOpcoes.map((g) => ({ grupo: g, itens: g.itens.filter((it) => selecoesGrupos[g.id]?.includes(it.id)) }));
  const gruposTotal = gruposSelecionados.reduce((s, g) => s + g.itens.reduce((s2, it) => s2 + it.preco, 0), 0);
  const precoUnitario = precoBase + gruposTotal;

  /* Ordem das secoes exibidas (variacao, depois cada grupo) — define pra onde rolar ao concluir uma. */
  const secaoOrder = [...(variacoes.length > 0 ? ["variacao"] : []), ...gruposOpcoes.map((g) => `grupo-${g.id}`)];

  function rolarParaProximaSecao(idAtual: string) {
    const idx = secaoOrder.indexOf(idAtual);
    const proximoId = idx >= 0 ? secaoOrder[idx + 1] : undefined;
    if (proximoId) secaoRefs.current[proximoId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selecionarVariacao(id: number) {
    setVariacaoId(id);
    rolarParaProximaSecao("variacao");
  }

  function alternarOpcao(grupoId: number, itemId: number, tipoSelecao: "unica" | "multipla", maxSelecao: number) {
    setSelecoesGrupos((atual) => {
      const selecionados = atual[grupoId] ?? [];
      const jaSelecionado = selecionados.includes(itemId);
      let novo: number[];
      if (tipoSelecao === "unica") {
        novo = jaSelecionado ? [] : [itemId];
      } else {
        if (!jaSelecionado && maxSelecao > 0 && selecionados.length >= maxSelecao) return atual;
        novo = jaSelecionado ? selecionados.filter((x) => x !== itemId) : [...selecionados, itemId];
      }
      const concluiu = !jaSelecionado && (tipoSelecao === "unica" || (maxSelecao > 0 && novo.length === maxSelecao));
      if (concluiu) rolarParaProximaSecao(`grupo-${grupoId}`);
      return { ...atual, [grupoId]: novo };
    });
  }

  const podeAdicionar =
    !carregando &&
    qtd <= estoqueDisponivel &&
    (!variacaoObrigatorio || variacaoId !== null) &&
    gruposOpcoes.every((g) => !g.obrigatorio || (selecoesGrupos[g.id]?.length ?? 0) > 0);

  function confirmar() {
    if (!produto || !podeAdicionar) return;
    const nomeVariacao = variacaoSelecionada ? [variacaoSelecionada.tamanho, variacaoSelecionada.cor].filter(Boolean).join(" - ") : "";
    let nome = nomeVariacao ? `${produto.nome} - ${nomeVariacao}` : produto.nome;
    for (const g of gruposSelecionados) {
      if (g.itens.length > 0) nome += ` + ${g.itens.map((it) => it.nome).join(", ")}`;
    }

    const dadosItem: Omit<PosCartItem, "rowKey"> = {
      produtoId: produto.id,
      nome,
      qtd,
      preco: precoUnitario,
      observacoes: observacoes.trim(),
      usarPontos: false,
      imagem: produto.imagem,
      variacaoId,
      selecoesGrupos,
    };

    if (itemEditando && onSalvar) {
      onSalvar(itemEditando.rowKey, dadosItem);
    } else {
      onAdicionar(dadosItem);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[420px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[420px]" showCloseButton={false}>
        <DialogTitle className="sr-only">{produto.nome}</DialogTitle>

        <div className="flex shrink-0 items-start gap-3">
          <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            {produto.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produto.imagem} alt={produto.nome} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground/40">
                <ShoppingBag className="size-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="line-clamp-2 text-sm leading-tight font-semibold">{produto.nome}</div>
            {produto.descricao ? (
              <div className="mt-0.5 line-clamp-2 text-xs leading-tight text-muted-foreground">{produto.descricao}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
            aria-label="Fechar"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {carregando ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Carregando opções...</div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div ref={(el) => { secaoRefs.current["variacao"] = el; }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">{variacaoTitulo ?? "Escolha uma das opções"}</span>
                {variacaoObrigatorio ? <span className="text-xs font-semibold text-destructive">Obrigatório</span> : null}
              </div>
              <div className="mt-2 space-y-1.5">
                {variacoes.map((v) => {
                  const label = [v.tamanho, v.cor].filter(Boolean).join(" - ") || `Opção #${v.id}`;
                  return (
                    <label
                      key={v.id}
                      className={`flex cursor-pointer items-center justify-between border-b p-2.5 text-sm transition-colors ${
                        variacaoId === v.id ? "bg-primary/5" : "hover:bg-muted/40"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="variacao"
                          checked={variacaoId === v.id}
                          onChange={() => selecionarVariacao(v.id)}
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

            {gruposOpcoes.map((grupo) => {
              const selecionados = selecoesGrupos[grupo.id] ?? [];
              const atingiuMax = grupo.tipo_selecao === "multipla" && grupo.max_selecao > 0 && selecionados.length >= grupo.max_selecao;
              return (
                <div key={grupo.id} ref={(el) => { secaoRefs.current[`grupo-${grupo.id}`] = el; }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary uppercase">{grupo.titulo}</span>
                    {grupo.obrigatorio ? <span className="text-xs font-semibold text-destructive">Obrigatório</span> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {grupo.tipo_selecao === "multipla"
                      ? grupo.max_selecao > 0
                        ? `Escolha até ${grupo.max_selecao} opç${grupo.max_selecao > 1 ? "ões" : "ão"}.`
                        : "Escolha 1 ou mais opções."
                      : "Escolha 1 opção."}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {grupo.itens.map((it) => {
                      const ativo = selecionados.includes(it.id);
                      const desabilitado = atingiuMax && !ativo;
                      return (
                        <div key={it.id} className={`flex items-center justify-between border-b p-2.5 text-sm ${desabilitado ? "opacity-40" : ""}`}>
                          <div>
                            <div>{it.nome}</div>
                            <div className="text-xs text-muted-foreground">{formatBRL(it.preco)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => alternarOpcao(grupo.id, it.id, grupo.tipo_selecao, grupo.max_selecao)}
                            disabled={desabilitado}
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed ${
                              ativo ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
                            }`}
                          >
                            {ativo ? <Check className="size-4" /> : <Plus className="size-4" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações do cliente"
              rows={2}
              className="w-full resize-none rounded-xl border-0 bg-muted/60 px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
        )}

        <div className="flex shrink-0 items-center justify-between pt-1">
          <div className="flex items-center gap-3 rounded-full bg-muted px-1 py-1">
            <button
              type="button"
              onClick={() => setQtd((q) => Math.max(1, q - 1))}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-4 text-center text-sm font-semibold tabular-nums">{qtd}</span>
            <button
              type="button"
              disabled={qtd >= estoqueDisponivel}
              onClick={() => setQtd((q) => Math.min(q + 1, estoqueDisponivel))}
              className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={confirmar}
            disabled={!podeAdicionar}
            className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {variacaoObrigatorio && variacaoId === null
              ? "Selecionar variação"
              : `${itemEditando ? "Salvar" : "Adicionar"} · ${formatBRL(precoUnitario * qtd)}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
