"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LayoutGrid, List, Minus, Plus, Search, ShoppingBag, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/components/ordermanager/constants";
import { cn } from "cn";
import type { PosCartItem, PosGrupoOpcoes, PosProduto, PosVariacao, PosVariacoesResposta } from "@/lib/pos";

/** Bolinha de selecao unica (variacao ou grupo "unica") — so o indicador visual, o <input> real fica sr-only. */
function Marcador({ marcado }: { marcado: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        marcado ? "border-primary" : "border-muted-foreground/25"
      )}
    >
      {marcado && <span className="size-2.5 rounded-full bg-primary" />}
    </span>
  );
}

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
  const [busca, setBusca] = useState("");
  const [visualizacaoGrade, setVisualizacaoGrade] = useState(true);
  /** Refs das secoes (variacao + cada grupo), na ordem exibida — usadas pra rolar ate a proxima quando uma secao e concluida. */
  const secaoRefs = useRef<Record<string, HTMLElement | null>>({});

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
    setBusca("");
    fetch(`/api/pos/produto-variacoes?id=${produto.id}`)
      .then((r) => r.json())
      .then((data: PosVariacoesResposta) => {
        if (data.ok) {
          const lista = data.variacoes ?? [];
          const gruposLista = data.grupos_opcoes ?? [];
          setVariacoes(lista);
          setVariacaoTitulo(data.variacao_titulo ?? null);
          setVariacaoObrigatorio(!!data.variacao_obrigatorio);
          setGruposOpcoes(gruposLista);

          // Reabrindo um pedido existente pra editar: os ids gravados no pedido podem nao
          // existir mais no catalogo (produto_variacoes/produto_opcoes_grupos/_itens sao
          // reescritos com ids novos a cada "Salvar" do produto, mesmo sem mudar o conteudo).
          // Resolve a selecao original por nome contra o catalogo atual em vez de confiar nos
          // ids antigos — sem isso, qualquer "Salvar" no produto (ate um ajuste sem relacao)
          // fazia o modal reabrir em branco pra pedidos ja feitos.
          const snapshot = itemEditando?.opcoesSnapshot;
          if (snapshot?.length) {
            const snapVariacao = snapshot.find((o) => o.tipo === "variacao");
            const variacaoPorId = lista.find((v) => v.id === itemEditando?.variacaoId);
            const variacaoPorNome = snapVariacao
              ? lista.find((v) => ([v.tamanho, v.cor].filter(Boolean).join(" - ") || "Variação") === snapVariacao.nome)
              : undefined;
            setVariacaoId((variacaoPorId ?? variacaoPorNome)?.id ?? null);

            const selecoesResolvidas: Record<number, number[]> = {};
            for (const grupo of gruposLista) {
              const nomesDoGrupo = snapshot.filter((o) => o.tipo === "grupo" && o.titulo === grupo.titulo).map((o) => o.nome);
              if (nomesDoGrupo.length === 0) continue;
              const ids = grupo.itens.filter((it) => nomesDoGrupo.includes(it.nome)).map((it) => it.id);
              if (ids.length > 0) selecoesResolvidas[grupo.id] = ids;
            }
            setSelecoesGrupos(selecoesResolvidas);
          }

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

  const emPromo = produto.preco_promocional !== null;

  /* Lista exibida, filtrada pela busca — a validacao continua usando as listas sem filtro. */
  const termo = busca.trim().toLowerCase();
  const variacoesFiltradas = termo
    ? variacoes.filter((v) => ([v.tamanho, v.cor].filter(Boolean).join(" - ") || `Opção #${v.id}`).toLowerCase().includes(termo))
    : variacoes;
  const gruposFiltrados = termo
    ? gruposOpcoes.map((g) => ({ ...g, itens: g.itens.filter((it) => it.nome.toLowerCase().includes(termo)) })).filter((g) => g.itens.length > 0)
    : gruposOpcoes;
  const semResultado = termo && variacoesFiltradas.length === 0 && gruposFiltrados.length === 0;

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
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(650px,calc(100vh-24px))] w-[1040px] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-[20px] p-0 sm:max-w-[1040px]"
      >
        <DialogTitle className="sr-only">{produto.nome}</DialogTitle>

        {/* Coluna fixa: imagem, nome, preco e descricao do produto */}
        <div className="flex w-[320px] shrink-0 flex-col overflow-y-auto px-6 py-6">
          <div className="aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-muted">
            {produto.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produto.imagem} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground/40">
                <ShoppingBag className="size-10" />
              </div>
            )}
          </div>
          <h2 className="mt-4 text-base leading-tight font-bold">{produto.nome}</h2>
          <div className="mt-1.5 flex items-baseline gap-1.5 text-sm">
            {emPromo && <span className="text-muted-foreground line-through">{formatBRL(produto.preco)}</span>}
            <span className="text-base font-bold text-primary">{formatBRL(produto.preco_promocional ?? produto.preco)}</span>
          </div>
          {produto.descricao && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{produto.descricao}</p>}
        </div>

        {/* Coluna rolavel: busca, variacao/grupos e rodape */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar complemento"
                className="rounded-full pl-8"
              />
            </div>
            <button
              type="button"
              onClick={() => setVisualizacaoGrade((v) => !v)}
              aria-label={visualizacaoGrade ? "Ver em lista" : "Ver em grade"}
              aria-pressed={visualizacaoGrade}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              {visualizacaoGrade ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-3">
            {carregando ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando opções...</div>
            ) : semResultado ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Nenhum item encontrado para &quot;{busca}&quot;.</div>
            ) : (
              <>
                {variacoesFiltradas.length > 0 && (
                  <section
                    ref={(el) => {
                      secaoRefs.current["variacao"] = el;
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-bold">{variacaoTitulo ?? "Escolha uma das opções"}</h3>
                      {variacaoObrigatorio && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            variacaoId === null ? "bg-destructive/10 text-destructive" : "bg-emerald-500/15 text-emerald-700"
                          )}
                        >
                          {variacaoId === null ? "Obrigatório" : "Ok"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 mb-2.5 text-xs text-muted-foreground">Escolha 1 opção.</p>

                    <div className={cn("grid gap-3", visualizacaoGrade ? "grid-cols-2" : "grid-cols-1")}>
                      {variacoesFiltradas.map((v) => {
                        const label = [v.tamanho, v.cor].filter(Boolean).join(" - ") || `Opção #${v.id}`;
                        const marcado = variacaoId === v.id;
                        return (
                          <label
                            key={v.id}
                            className={cn(
                              "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors",
                              marcado && "border-primary/30 bg-primary/5"
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm leading-tight font-medium">{label}</span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">{formatBRL(v.preco)}</span>
                            </span>
                            <input type="radio" name="variacao" checked={marcado} onChange={() => selecionarVariacao(v.id)} className="sr-only" />
                            <Marcador marcado={marcado} />
                          </label>
                        );
                      })}
                    </div>
                  </section>
                )}

                {gruposFiltrados.map((grupo) => {
                  const selecionados = selecoesGrupos[grupo.id] ?? [];
                  const atingiuMax = grupo.tipo_selecao === "multipla" && grupo.max_selecao > 0 && selecionados.length >= grupo.max_selecao;
                  const faltando = grupo.obrigatorio === 1 && selecionados.length === 0;
                  const dica =
                    grupo.tipo_selecao === "multipla"
                      ? grupo.max_selecao > 0
                        ? `Escolha até ${grupo.max_selecao} opç${grupo.max_selecao > 1 ? "ões" : "ão"}.`
                        : "Escolha 1 ou mais opções."
                      : "Escolha 1 opção.";
                  return (
                    <section
                      key={grupo.id}
                      ref={(el) => {
                        secaoRefs.current[`grupo-${grupo.id}`] = el;
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold uppercase">{grupo.titulo}</h3>
                        {grupo.obrigatorio === 1 && (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              faltando ? "bg-destructive/10 text-destructive" : "bg-emerald-500/15 text-emerald-700"
                            )}
                          >
                            {faltando ? "Obrigatório" : "Ok"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 mb-2.5 text-xs text-muted-foreground">{dica}</p>

                      <div className={cn("grid gap-3", visualizacaoGrade ? "grid-cols-2" : "grid-cols-1")}>
                        {grupo.itens.map((it) => {
                          const ativo = selecionados.includes(it.id);
                          const desabilitado = atingiuMax && !ativo;
                          if (grupo.tipo_selecao === "unica") {
                            return (
                              <label
                                key={it.id}
                                className={cn(
                                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors",
                                  ativo && "border-primary/30 bg-primary/5",
                                  desabilitado && "cursor-not-allowed opacity-40"
                                )}
                              >
                                <span className="min-w-0">
                                  <span className="block text-sm leading-tight font-medium">{it.nome}</span>
                                  <span className="mt-0.5 block text-xs text-muted-foreground">{formatBRL(it.preco)}</span>
                                </span>
                                <input
                                  type="radio"
                                  name={`grupo-${grupo.id}`}
                                  checked={ativo}
                                  disabled={desabilitado}
                                  onChange={() => alternarOpcao(grupo.id, it.id, grupo.tipo_selecao, grupo.max_selecao)}
                                  className="sr-only"
                                />
                                <Marcador marcado={ativo} />
                              </label>
                            );
                          }
                          return (
                            <div
                              key={it.id}
                              className={cn(
                                "flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors",
                                ativo && "border-primary/30 bg-primary/5",
                                desabilitado && "opacity-40"
                              )}
                            >
                              <div className="min-w-0">
                                <div className="text-sm leading-tight font-medium">{it.nome}</div>
                                <div className="mt-0.5 text-xs text-muted-foreground">{formatBRL(it.preco)}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => alternarOpcao(grupo.id, it.id, grupo.tipo_selecao, grupo.max_selecao)}
                                disabled={desabilitado}
                                className={cn(
                                  "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed",
                                  ativo ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
                                )}
                              >
                                {ativo ? <Check className="size-4" /> : <Plus className="size-4" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </>
            )}
          </div>

          {/* Rodape: observacoes, quantidade e confirmar */}
          <div className="shrink-0 space-y-2.5 border-t bg-background px-4 pt-3 pb-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold">Observações do cliente</span>
              <input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: sem cebola, molho à parte..."
                className="w-full rounded-2xl border px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-1">
                <button
                  type="button"
                  disabled={qtd <= 1}
                  onClick={() => setQtd((q) => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-background shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums">{qtd}</span>
                <button
                  type="button"
                  disabled={qtd >= estoqueDisponivel}
                  onClick={() => setQtd((q) => Math.min(q + 1, estoqueDisponivel))}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={confirmar}
                disabled={!podeAdicionar}
                className="h-11 flex-1 cursor-pointer rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {variacaoObrigatorio && variacaoId === null
                  ? "Selecionar variação"
                  : `${itemEditando ? "Salvar" : "Adicionar"} ${formatBRL(precoUnitario * qtd)}`}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
