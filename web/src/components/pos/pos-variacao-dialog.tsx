"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LayoutGrid, List, Minus, Plus, Search, ShoppingBag, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/components/ordermanager/constants";
import { cn } from "cn";
import type { PosCartDetalheGrupo, PosCartItem, PosGrupoOpcoes, PosProduto, PosVariacao, PosVariacoesResposta } from "@/lib/pos";
import {
  alterarSelecao,
  complementosParaEnvio,
  dicaDoGrupo,
  grupoPendente,
  precoComplementos,
  minimoDoGrupo,
  qtdNoGrupo,
  rotuloComplementos,
  selecaoDeEscolhidos,
  type ComplementoGrupoVenda,
  itensEscolhidos,
  type ComplementoItemVenda,
  type SelecaoComplementos,
} from "@/lib/complementos";

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

/* Estado das escolhas usado pra saber se uma secao do modal ja foi concluida. */
type EstadoSecoes = {
  modoQtd: boolean;
  variacaoId: number | null;
  qtdVariacoes: Record<number, number>;
  gruposOpcoes: PosGrupoOpcoes[];
  selecoesGrupos: Record<number, number[]>;
  complementos: ComplementoGrupoVenda[];
  selecaoComplementos: SelecaoComplementos;
};

/** Secao concluida = ja tem o minimo exigido ou chegou no maximo permitido. */
function secaoConcluida(id: string, e: EstadoSecoes): boolean {
  if (id === "variacao") return e.modoQtd ? Object.values(e.qtdVariacoes).some((q) => q > 0) : e.variacaoId !== null;
  if (id.startsWith("grupo-")) {
    const g = e.gruposOpcoes.find((x) => `grupo-${x.id}` === id);
    if (!g) return true;
    const n = e.selecoesGrupos[g.id]?.length ?? 0;
    if (g.tipo_selecao === "unica") return n >= 1;
    return g.max_selecao > 0 ? n >= g.max_selecao : !!g.obrigatorio && n >= 1;
  }
  const g = e.complementos.find((x) => `complemento-${x.id}` === id);
  if (!g) return true;
  const n = qtdNoGrupo(e.selecaoComplementos, g.id);
  const min = minimoDoGrupo(g);
  return (g.maximo > 0 && n >= g.maximo) || (min > 0 && n >= min);
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
  const [complementos, setComplementos] = useState<ComplementoGrupoVenda[]>([]);
  const [selecaoComplementos, setSelecaoComplementos] = useState<SelecaoComplementos>({});

  const [variacaoId, setVariacaoId] = useState<number | null>(null);
  /** Quantidade escolhida por variacao (lancamento novo): cada variacao com qtd > 0 vira um item no carrinho. */
  const [qtdVariacoes, setQtdVariacoes] = useState<Record<number, number>>({});
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
    setComplementos([]);
    setSelecaoComplementos({});
    setVariacaoId(itemEditando?.variacaoId ?? null);
    setQtdVariacoes({});
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
          const complementosLista = data.complementos ?? [];
          setComplementos(complementosLista);
          setSelecaoComplementos(selecaoDeEscolhidos(complementosLista, itemEditando?.complementos));

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

        }
      })
      .catch(() => setVariacoes([]))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto, itemEditando]);

  /* Ao concluir uma secao (variacao, grupo ou complemento), rola suavemente ate a proxima secao
     ainda pendente — mesmo comportamento do modal de combo. */
  const secaoAlteradaRef = useRef<{ id: string; antes: boolean } | null>(null);
  const estadoSecoes: EstadoSecoes = {
    modoQtd: !itemEditando && variacoes.length > 0,
    variacaoId,
    qtdVariacoes,
    gruposOpcoes,
    selecoesGrupos,
    complementos,
    selecaoComplementos,
  };
  function marcarSecaoAlterada(id: string) {
    secaoAlteradaRef.current = { id, antes: secaoConcluida(id, estadoSecoes) };
  }
  useEffect(() => {
    const alterada = secaoAlteradaRef.current;
    if (!alterada) return;
    secaoAlteradaRef.current = null;
    const e: EstadoSecoes = {
      modoQtd: !itemEditando && variacoes.length > 0,
      variacaoId,
      qtdVariacoes,
      gruposOpcoes,
      selecoesGrupos,
      complementos,
      selecaoComplementos,
    };
    if (alterada.antes || !secaoConcluida(alterada.id, e)) return;
    const ordem = [
      ...(variacoes.length > 0 ? ["variacao"] : []),
      ...gruposOpcoes.map((g) => `grupo-${g.id}`),
      ...complementos.map((g) => `complemento-${g.id}`),
    ];
    const proxima = ordem.slice(ordem.indexOf(alterada.id) + 1).find((id) => !secaoConcluida(id, e));
    if (proxima) secaoRefs.current[proxima]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [itemEditando, variacaoId, qtdVariacoes, selecoesGrupos, selecaoComplementos, variacoes, gruposOpcoes, complementos]);

  if (!produto) return null;

  const variacaoSelecionada = variacoes.find((v) => v.id === variacaoId) ?? null;
  /* Variacao com estoque proprio limita a quantidade pelo saldo dela. */
  const limiteQtd = variacaoSelecionada?.estoque != null ? Math.min(estoqueDisponivel, variacaoSelecionada.estoque) : estoqueDisponivel;
  const precoBase = variacaoSelecionada ? (variacaoSelecionada.preco > 0 ? variacaoSelecionada.preco : produto.preco) : produto.preco;
  const gruposSelecionados = gruposOpcoes.map((g) => ({ grupo: g, itens: g.itens.filter((it) => selecoesGrupos[g.id]?.includes(it.id)) }));
  const gruposTotal = gruposSelecionados.reduce((s, g) => s + g.itens.reduce((s2, it) => s2 + it.preco, 0), 0);
  const precoUnitario = precoBase + gruposTotal + precoComplementos(complementos, selecaoComplementos);
  /* Produto so com complementos (sem variacoes cadastradas) nao exige variacao. */
  const exigeVariacao = variacaoObrigatorio && variacoes.length > 0;

  const emPromo = produto.preco_promocional !== null;

  /* Lancamento novo de produto com variacoes: cada opcao tem seu proprio contador de quantidade
     (ex.: 2 Queijo + 3 Mista de uma vez). Editando um item do carrinho continua escolha unica. */
  const modoQtdPorVariacao = !itemEditando && variacoes.length > 0;
  const precoBaseDe = (v: PosVariacao) => (v.preco > 0 ? v.preco : produto.preco);
  const adicionaisUnit = gruposTotal + precoComplementos(complementos, selecaoComplementos);
  const variacoesEscolhidas = modoQtdPorVariacao ? variacoes.filter((v) => (qtdVariacoes[v.id] ?? 0) > 0) : [];
  const totalQtdVariacoes = variacoesEscolhidas.reduce((s, v) => s + (qtdVariacoes[v.id] ?? 0), 0);
  const totalValorVariacoes = variacoesEscolhidas.reduce((s, v) => s + (precoBaseDe(v) + adicionaisUnit) * (qtdVariacoes[v.id] ?? 0), 0);
  /* Nenhuma variacao contada (e variacao opcional): cai no fluxo normal, produto sem variacao + quantidade do rodape. */
  const usandoQtdPorVariacao = variacoesEscolhidas.length > 0;
  const faltaVariacao = modoQtdPorVariacao ? exigeVariacao && !usandoQtdPorVariacao : exigeVariacao && variacaoId === null;

  /** Limite de uma variacao: o estoque dela e o que sobra do estoque do produto depois das outras variacoes contadas. */
  function maxDaVariacao(v: PosVariacao, atual: Record<number, number>) {
    const somaOutras = Object.entries(atual).reduce((s, [id, q]) => (Number(id) === v.id ? s : s + q), 0);
    return Math.max(0, Math.min(v.estoque ?? Infinity, estoqueDisponivel - somaOutras));
  }

  function alterarQtdVariacao(v: PosVariacao, delta: 1 | -1) {
    if (delta === 1) marcarSecaoAlterada("variacao");
    setQtdVariacoes((atual) => {
      const nova = Math.max(0, Math.min((atual[v.id] ?? 0) + delta, maxDaVariacao(v, atual)));
      return { ...atual, [v.id]: nova };
    });
  }

  /* Lista exibida, filtrada pela busca — a validacao continua usando as listas sem filtro. */
  const termo = busca.trim().toLowerCase();
  const variacoesFiltradas = termo
    ? variacoes.filter((v) => ([v.tamanho, v.cor].filter(Boolean).join(" - ") || `Opção #${v.id}`).toLowerCase().includes(termo))
    : variacoes;
  const gruposFiltrados = termo
    ? gruposOpcoes.map((g) => ({ ...g, itens: g.itens.filter((it) => it.nome.toLowerCase().includes(termo)) })).filter((g) => g.itens.length > 0)
    : gruposOpcoes;
  const complementosFiltrados = termo
    ? complementos.map((g) => ({ ...g, itens: g.itens.filter((it) => it.nome.toLowerCase().includes(termo)) })).filter((g) => g.itens.length > 0)
    : complementos;
  const semResultado = termo && variacoesFiltradas.length === 0 && gruposFiltrados.length === 0 && complementosFiltrados.length === 0;

  function selecionarVariacao(id: number) {
    marcarSecaoAlterada("variacao");
    setVariacaoId(id);
  }

  function alternarOpcao(grupoId: number, itemId: number, tipoSelecao: "unica" | "multipla", maxSelecao: number) {
    if (!(selecoesGrupos[grupoId] ?? []).includes(itemId)) marcarSecaoAlterada(`grupo-${grupoId}`);
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
      return { ...atual, [grupoId]: novo };
    });
  }

  function alterarComplemento(grupo: ComplementoGrupoVenda, item: ComplementoItemVenda, delta: 1 | -1) {
    if (delta === 1) marcarSecaoAlterada(`complemento-${grupo.id}`);
    setSelecaoComplementos(alterarSelecao(selecaoComplementos, grupo, item, delta));
  }

  const podeAdicionar =
    !carregando &&
    (usandoQtdPorVariacao ? totalQtdVariacoes <= estoqueDisponivel : qtd <= limiteQtd) &&
    !faltaVariacao &&
    gruposOpcoes.every((g) => !g.obrigatorio || (selecoesGrupos[g.id]?.length ?? 0) > 0) &&
    complementos.every((g) => !grupoPendente(g, selecaoComplementos));

  /* Opcoes escolhidas por grupo (titulo do grupo + itens), pro card do Resumo do pedido. */
  function montarDetalhes(): PosCartDetalheGrupo[] {
    const lista: PosCartDetalheGrupo[] = [];
    for (const g of gruposSelecionados) {
      if (g.itens.length > 0) lista.push({ titulo: g.grupo.titulo, itens: g.itens.map((it) => ({ qtd: 1, nome: it.nome, preco: it.preco })) });
    }
    for (const { grupo, item, qtd: q } of itensEscolhidos(complementos, selecaoComplementos)) {
      const existente = lista.find((d) => d.titulo === grupo.nome);
      const linha = { qtd: q, nome: item.nome, preco: item.preco * q };
      if (existente) existente.itens.push(linha);
      else lista.push({ titulo: grupo.nome, itens: [linha] });
    }
    return lista;
  }

  function confirmar() {
    if (!produto || !podeAdicionar) return;
    const detalhes = montarDetalhes();
    if (usandoQtdPorVariacao) {
      let sufixo = "";
      for (const g of gruposSelecionados) {
        if (g.itens.length > 0) sufixo += ` + ${g.itens.map((it) => it.nome).join(", ")}`;
      }
      sufixo += rotuloComplementos(complementos, selecaoComplementos);
      for (const v of variacoesEscolhidas) {
        const nomeVariacao = [v.tamanho, v.cor].filter(Boolean).join(" - ");
        onAdicionar({
          produtoId: produto.id,
          nome: `${nomeVariacao ? `${produto.nome} - ${nomeVariacao}` : produto.nome}${sufixo}`,
          qtd: qtdVariacoes[v.id] ?? 0,
          preco: precoBaseDe(v) + adicionaisUnit,
          observacoes: observacoes.trim(),
          usarPontos: false,
          imagem: produto.imagem,
          variacaoId: v.id,
          selecoesGrupos,
          complementos: complementosParaEnvio(complementos, selecaoComplementos),
          nomeExibicao: nomeVariacao ? `${produto.nome} - ${nomeVariacao}` : produto.nome,
          detalhes,
        });
      }
      onOpenChange(false);
      return;
    }
    const nomeVariacao = variacaoSelecionada ? [variacaoSelecionada.tamanho, variacaoSelecionada.cor].filter(Boolean).join(" - ") : "";
    const nomeExibicao = nomeVariacao ? `${produto.nome} - ${nomeVariacao}` : produto.nome;
    let nome = nomeExibicao;
    for (const g of gruposSelecionados) {
      if (g.itens.length > 0) nome += ` + ${g.itens.map((it) => it.nome).join(", ")}`;
    }
    nome += rotuloComplementos(complementos, selecaoComplementos);

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
      complementos: complementosParaEnvio(complementos, selecaoComplementos),
      nomeExibicao,
      detalhes,
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
        className="flex h-[min(650px,calc(100vh-24px))] w-[1040px] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-[20px] p-0 sm:max-w-[1040px] max-md:h-[92dvh] max-md:flex-col"
      >
        <DialogTitle className="sr-only">{produto.nome}</DialogTitle>

        {/* Coluna fixa: imagem, nome, preco e descricao do produto */}
        <div className="flex w-[320px] shrink-0 flex-col overflow-y-auto px-6 py-6 max-md:grid max-md:w-full max-md:grid-cols-[64px_1fr] max-md:gap-x-3 max-md:overflow-visible max-md:px-4 max-md:pt-6 max-md:pb-1">
          <div className="aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-muted max-md:row-span-2 max-md:size-16 max-md:rounded-xl">
            {produto.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produto.imagem} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground/40">
                <ShoppingBag className="size-10" />
              </div>
            )}
          </div>
          <h2 className="mt-4 text-base leading-tight font-bold max-md:mt-0 max-md:line-clamp-2 max-md:self-end">{produto.nome}</h2>
          <div className="mt-1.5 flex items-baseline gap-1.5 text-sm max-md:mt-0.5 max-md:self-start">
            {emPromo && <span className="text-muted-foreground line-through">{formatBRL(produto.preco)}</span>}
            <span className="text-base font-bold text-primary">{formatBRL(produto.preco_promocional ?? produto.preco)}</span>
          </div>
          {produto.descricao && <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-md:col-span-2 max-md:line-clamp-2">{produto.descricao}</p>}
        </div>

        {/* Coluna rolavel: busca, variacao/grupos e rodape */}
        <div className="flex min-w-0 flex-1 flex-col max-md:min-h-0">
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
                            faltaVariacao ? "bg-destructive/10 text-destructive" : "bg-emerald-500/15 text-emerald-700"
                          )}
                        >
                          {faltaVariacao ? "Obrigatório" : "Ok"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 mb-2.5 text-xs text-muted-foreground">
                      {modoQtdPorVariacao ? "Informe a quantidade de cada opção." : "Escolha 1 opção."}
                    </p>

                    <div className={cn("grid gap-3", visualizacaoGrade ? "grid-cols-2" : "grid-cols-1")}>
                      {variacoesFiltradas.map((v) => {
                        const label = [v.tamanho, v.cor].filter(Boolean).join(" - ") || `Opção #${v.id}`;
                        const marcado = variacaoId === v.id;
                        const esgotada = v.estoque !== null && v.estoque <= 0;
                        if (modoQtdPorVariacao) {
                          const qtdV = qtdVariacoes[v.id] ?? 0;
                          const ativa = qtdV > 0;
                          const podeSomar = !esgotada && qtdV < maxDaVariacao(v, qtdVariacoes);
                          return (
                            <div
                              key={v.id}
                              className={cn(
                                "flex items-center justify-between gap-3 rounded-xl border bg-background p-3.5 transition-colors",
                                ativa && "border-primary/30 bg-primary/5",
                                esgotada && !ativa && "opacity-50"
                              )}
                            >
                              <span className="min-w-0">
                                <span className="block text-sm leading-tight font-medium">{label}</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {formatBRL(v.preco)}
                                  {/* Estoque restante ja descontando a quantidade escolhida aqui — atualiza a cada +/−. */}
                                  {v.estoque !== null &&
                                    (esgotada ? (
                                      " · Esgotado"
                                    ) : (
                                      <>
                                        {" · "}
                                        <span className={cn("tabular-nums transition-colors", ativa && "font-medium text-primary")}>
                                          {Math.max(0, v.estoque - qtdV)}
                                        </span>
                                        {" em estoque"}
                                      </>
                                    ))}
                                </span>
                              </span>
                              {ativa ? (
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => alterarQtdVariacao(v, -1)}
                                    aria-label={`Remover um ${label}`}
                                    className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70"
                                  >
                                    <Minus className="size-4" />
                                  </button>
                                  <span className="w-5 text-center text-sm font-semibold tabular-nums">{qtdV}</span>
                                  <button
                                    type="button"
                                    onClick={() => alterarQtdVariacao(v, 1)}
                                    disabled={!podeSomar}
                                    aria-label={`Adicionar mais um ${label}`}
                                    className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Plus className="size-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => alterarQtdVariacao(v, 1)}
                                  disabled={!podeSomar}
                                  aria-label={`Adicionar ${label}`}
                                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Plus className="size-4" />
                                </button>
                              )}
                            </div>
                          );
                        }
                        return (
                          <label
                            key={v.id}
                            className={cn(
                              "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors",
                              marcado && "border-primary/30 bg-primary/5",
                              esgotada && !marcado && "cursor-not-allowed opacity-50"
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm leading-tight font-medium">{label}</span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {formatBRL(v.preco)}
                                {v.estoque !== null && (esgotada ? " · Esgotado" : ` · ${v.estoque} em estoque`)}
                              </span>
                            </span>
                            <input
                              type="radio"
                              name="variacao"
                              checked={marcado}
                              disabled={esgotada && !marcado}
                              onChange={() => selecionarVariacao(v.id)}
                              className="sr-only"
                            />
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

                {complementosFiltrados.map((grupo) => {
                  const pendente = grupoPendente(grupo, selecaoComplementos);
                  const exigido = grupo.obrigatorio || grupo.minimo > 0;
                  const noLimite = grupo.maximo > 0 && qtdNoGrupo(selecaoComplementos, grupo.id) >= grupo.maximo;
                  return (
                    <section
                      key={`complemento-${grupo.id}`}
                      ref={(el) => {
                        secaoRefs.current[`complemento-${grupo.id}`] = el;
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold">{grupo.nome}</h3>
                        {exigido && (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              pendente ? "bg-destructive/10 text-destructive" : "bg-emerald-500/15 text-emerald-700"
                            )}
                          >
                            {pendente ? "Obrigatório" : "Ok"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 mb-2.5 text-xs text-muted-foreground">{dicaDoGrupo(grupo)}</p>

                      <div className={cn("grid gap-3", visualizacaoGrade ? "grid-cols-2" : "grid-cols-1")}>
                        {grupo.itens.map((it) => (
                          <CardComplemento
                            key={it.id}
                            item={it}
                            qtd={selecaoComplementos[grupo.id]?.[it.id] ?? 0}
                            escolhaUnica={grupo.maximo === 1}
                            noLimite={noLimite}
                            onAlterar={(delta) => alterarComplemento(grupo, it, delta)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </>
            )}
          </div>

          {/* Rodape: observacoes, quantidade e confirmar */}
          <div className="shrink-0 space-y-2.5 bg-background px-4 pt-3 pb-4">
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
              {/* Com quantidade por opcao o contador geral some: cada opcao ja tem o seu. */}
              <div className={cn("flex shrink-0 items-center gap-1 rounded-full bg-muted p-1", usandoQtdPorVariacao && "hidden")}>
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
                  disabled={qtd >= limiteQtd}
                  onClick={() => setQtd((q) => Math.min(q + 1, limiteQtd))}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={confirmar}
                disabled={!podeAdicionar}
                className="h-11 flex-1 cursor-pointer rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {usandoQtdPorVariacao
                  ? `Adicionar ${totalQtdVariacoes} ${totalQtdVariacoes === 1 ? "item" : "itens"} · ${formatBRL(totalValorVariacoes)}`
                  : faltaVariacao
                    ? modoQtdPorVariacao
                      ? "Escolha a quantidade"
                      : "Selecionar variação"
                    : `${itemEditando ? "Salvar" : "Adicionar"} ${formatBRL(precoUnitario * qtd)}`}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Card de um item de complemento: escolha unica vira bolinha; nos demais o "+" adiciona e,
 * se o item pode repetir, aparece o contador (- qtd +).
 */
function CardComplemento({
  item,
  qtd,
  escolhaUnica,
  noLimite,
  onAlterar,
}: {
  item: ComplementoItemVenda;
  qtd: number;
  escolhaUnica: boolean;
  /** O grupo ja chegou no maximo de escolhas. */
  noLimite: boolean;
  onAlterar: (delta: 1 | -1) => void;
}) {
  const esgotado = item.estoque !== null && item.estoque <= 0;
  const ativo = qtd > 0;
  const podeSomar = !esgotado && !noLimite && (item.podeRepetir || qtd === 0) && (item.estoque === null || qtd < item.estoque);
  const travado = !ativo && (esgotado || (noLimite && !escolhaUnica));

  const conteudo = (
    <span className="min-w-0">
      <span className="block text-sm leading-tight font-medium">{item.nome}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{esgotado ? "Esgotado" : formatBRL(item.preco)}</span>
    </span>
  );

  if (escolhaUnica) {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={ativo}
        disabled={esgotado && !ativo}
        onClick={() => onAlterar(1)}
        className={cn(
          "flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors disabled:cursor-not-allowed",
          ativo && "border-primary/30 bg-primary/5",
          travado && "opacity-40"
        )}
      >
        {conteudo}
        <Marcador marcado={ativo} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border bg-background p-3.5 transition-colors",
        ativo && "border-primary/30 bg-primary/5",
        travado && "opacity-40"
      )}
    >
      {conteudo}
      {ativo && item.podeRepetir ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAlterar(-1)}
            aria-label={`Remover um ${item.nome}`}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-5 text-center text-sm font-semibold tabular-nums">{qtd}</span>
          <button
            type="button"
            onClick={() => onAlterar(1)}
            disabled={!podeSomar}
            aria-label={`Adicionar mais um ${item.nome}`}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onAlterar(ativo ? -1 : 1)}
          disabled={!ativo && !podeSomar}
          aria-pressed={ativo}
          aria-label={ativo ? `Remover ${item.nome}` : `Adicionar ${item.nome}`}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed"
        >
          {ativo ? <Check className="size-4" /> : <Plus className="size-4" />}
        </button>
      )}
    </div>
  );
}
