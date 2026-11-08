"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Expand, ImageIcon, Minus, Plus, Shrink, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StoreSheet } from "@/components/store/store-sheet";
import { PontosBadge } from "@/components/store/pontos-badge";
import { QtyStepper } from "@/components/store/qty-stepper";
import { useStoreTheme } from "@/components/store/store-theme";
import { avisarEstoqueIndisponivel } from "@/components/store/toast-estoque";
import { formatarPreco } from "@/lib/store/format";
import { PRODUTO_IMAGEM_PADRAO } from "@/lib/produtoImagem";
import type { StoreCartItem, StoreProduto, StoreProdutoVariacoes } from "@/lib/store/types";
import {
  alterarSelecao,
  complementosParaEnvio,
  dicaDoGrupo,
  grupoPendente,
  itensEscolhidos,
  precoComplementos,
  qtdNoGrupo,
  rotuloComplementos,
  type ComplementoGrupoVenda,
  type ComplementoItemVenda,
  type SelecaoComplementos,
} from "@/lib/complementos";

/* Computador (>= 940px): modal de duas colunas; celular: visual do combo. */
const MQ_DESKTOP = "(min-width: 940px)";
function assinarDesktop(cb: () => void) {
  const mq = window.matchMedia(MQ_DESKTOP);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useDesktop() {
  return useSyncExternalStore(assinarDesktop, () => window.matchMedia(MQ_DESKTOP).matches, () => false);
}

export function StoreProdutoDialog({
  produto,
  lojaId,
  mostrarPontos = false,
  jaNoCarrinho = 0,
  consumoVariacoes,
  open,
  onOpenChange,
  onAdicionar,
  somenteVisualizar = false,
}: {
  produto: StoreProduto | null;
  lojaId: number;
  /** Clube de Pontos ativo na loja — habilita o selo "+N pts". */
  mostrarPontos?: boolean;
  /** Unidades deste produto que o carrinho ja tem (todas as linhas, inclusive variacoes) — saem do estoque disponivel. */
  jaNoCarrinho?: number;
  /** Unidades de cada variacao deste produto que o carrinho ja tem — saem do estoque proprio da variacao. */
  consumoVariacoes?: Record<number, number>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdicionar: (item: Omit<StoreCartItem, "key">) => void;
  /** Loja com "Receber pedidos" desligado: mostra o produto e o valor, sem adicionar ao carrinho. */
  somenteVisualizar?: boolean;
}) {
  const { brown } = useStoreTheme();
  const desktop = useDesktop();
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const [detalhe, setDetalhe] = useState<StoreProdutoVariacoes | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [variacaoId, setVariacaoId] = useState<number | null>(null);
  /** Quantidade escolhida de cada variacao (ex.: 2 Queijo + 3 Mista): cada uma vira um item no carrinho. */
  const [qtdVariacoes, setQtdVariacoes] = useState<Record<number, number>>({});
  const [selecoesGrupos, setSelecoesGrupos] = useState<Record<number, number[]>>({});
  const [selecaoComplementos, setSelecaoComplementos] = useState<SelecaoComplementos>({});
  /* Comeca ja expandida (foto inteira, sem cortar) tanto no desktop quanto no mobile —
     o botao "Recolher" continua disponivel pra quem preferir a miniatura cortada. */
  const [imagemAmpliada, setImagemAmpliada] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  /** Refs das secoes (variacao + cada grupo), na ordem exibida — usadas pra rolar ate a proxima quando uma secao e concluida. */
  const secaoRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const temVariacoes = produto?.tem_variacoes === 1;
  /* Produto com grupos da tela Complementos: usa o mesmo modal de opcoes, mesmo sem variacoes. */
  const temOpcoes = temVariacoes || produto?.tem_complementos === 1;

  useEffect(() => {
    if (!open || !produto) return;
    const qtdMin = Math.max(0, produto.quantidade_minima ?? 0);
    setQtd(qtdMin > 0 ? qtdMin : 1);
    setObs("");
    setImagemAmpliada(true);
    setAspectRatio(null);
    setVariacaoId(null);
    setQtdVariacoes({});
    setSelecoesGrupos({});
    setSelecaoComplementos({});
    setDetalhe(null);
    setErroCarregar(false);

    if (produto.tem_variacoes === 1 || produto.tem_complementos === 1) {
      setCarregando(true);
      fetch(`/api/store/produto-variacoes?produto_id=${produto.id}&loja_id=${lojaId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) setDetalhe(data as StoreProdutoVariacoes);
          else setErroCarregar(true);
        })
        .catch(() => setErroCarregar(true))
        .finally(() => setCarregando(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, produto?.id, lojaId]);

  if (!produto) return null;

  const variacaoSelecionada = detalhe?.variacoes.find((v) => v.id === variacaoId) ?? null;
  const variacaoObrigatoria = temVariacoes && detalhe?.variacao_obrigatorio === 1;

  const gruposSelecionados = (detalhe?.grupos_opcoes ?? []).map((g) => ({
    grupo: g,
    itens: g.itens.filter((it) => selecoesGrupos[g.id]?.includes(it.id)),
  }));

  const precoBase = temVariacoes
    ? variacaoSelecionada
      ? variacaoSelecionada.preco > 0
        ? variacaoSelecionada.preco
        : produto.preco_produto
      : variacaoObrigatoria
        ? 0
        : produto.preco_produto
    : produto.preco_final;
  const precoGrupos = gruposSelecionados.reduce((s, g) => s + g.itens.reduce((s2, it) => s2 + it.preco, 0), 0);
  const complementos: ComplementoGrupoVenda[] = detalhe?.complementos ?? [];
  const precoUnitario = precoBase + precoGrupos + precoComplementos(complementos, selecaoComplementos);

  /* Quantidade por variacao: cada sabor tem seu contador. O estoque de cada um desconta o que o
     carrinho ja tem daquele sabor, e a soma de todos respeita o estoque do produto. */
  type VariacaoLoja = StoreProdutoVariacoes["variacoes"][number];
  const adicionaisUnit = precoGrupos + precoComplementos(complementos, selecaoComplementos);
  const precoBaseDe = (v: VariacaoLoja) => (v.preco > 0 ? v.preco : produto.preco_produto);
  const produtoRestante = Math.max(0, produto.estoque - jaNoCarrinho);
  const disponivelVariacao = (v: VariacaoLoja) => (v.estoque === null ? Infinity : Math.max(0, v.estoque - (consumoVariacoes?.[v.id] ?? 0)));
  function maxDaVariacao(v: VariacaoLoja, atual: Record<number, number>) {
    const somaOutras = Object.entries(atual).reduce((s, [id, q]) => (Number(id) === v.id ? s : s + q), 0);
    return Math.max(0, Math.min(disponivelVariacao(v), produtoRestante - somaOutras));
  }
  function alterarQtdVariacao(v: VariacaoLoja, delta: 1 | -1) {
    if (delta === 1 && (qtdVariacoes[v.id] ?? 0) >= maxDaVariacao(v, qtdVariacoes)) {
      avisarEstoqueIndisponivel();
      return;
    }
    const nova = Math.max(0, (qtdVariacoes[v.id] ?? 0) + delta);
    const proximo = { ...qtdVariacoes, [v.id]: nova };
    setQtdVariacoes(proximo);
    if (delta === 1 && nova === 1 && Object.values(qtdVariacoes).every((q) => !q)) rolarParaProximaSecao("variacao");
  }
  const variacoesEscolhidas = temVariacoes ? (detalhe?.variacoes ?? []).filter((v) => (qtdVariacoes[v.id] ?? 0) > 0) : [];
  const usandoQtdPorVariacao = variacoesEscolhidas.length > 0;
  const totalQtdVariacoes = variacoesEscolhidas.reduce((s, v) => s + (qtdVariacoes[v.id] ?? 0), 0);
  const total = usandoQtdPorVariacao
    ? variacoesEscolhidas.reduce((s, v) => s + (precoBaseDe(v) + adicionaisUnit) * (qtdVariacoes[v.id] ?? 0), 0)
    : precoUnitario * qtd;

  const faltaVariacao = variacaoObrigatoria && !usandoQtdPorVariacao;
  const faltaGrupoObrigatorio =
    (temVariacoes && (detalhe?.grupos_opcoes ?? []).some((g) => g.obrigatorio === 1 && (selecoesGrupos[g.id]?.length ?? 0) === 0)) ||
    complementos.some((g) => grupoPendente(g, selecaoComplementos));
  /* Estoque que ainda cabe: o do produto menos o que ja esta no carrinho. */
  /* Variacao com estoque proprio tambem limita pelo saldo dela. */
  const estoqueVariacao = variacaoSelecionada?.estoque ?? null;
  const estoqueRestante = Math.min(Math.max(0, produto.estoque - jaNoCarrinho), estoqueVariacao ?? Infinity);
  const podeAdicionar =
    !produto.esgotado &&
    (usandoQtdPorVariacao ? totalQtdVariacoes <= produtoRestante : estoqueRestante > 0 && qtd <= estoqueRestante) &&
    !carregando &&
    !faltaVariacao &&
    !faltaGrupoObrigatorio;

  /* Ordem das secoes exibidas (variacao, depois cada grupo) — define pra onde rolar ao concluir uma. */
  const secaoOrder = [
    ...(temVariacoes ? ["variacao"] : []),
    ...(detalhe?.grupos_opcoes ?? []).map((g) => `grupo-${g.id}`),
    ...complementos.map((g) => `complemento-${g.id}`),
  ];

  function rolarParaProximaSecao(idAtual: string) {
    const idx = secaoOrder.indexOf(idAtual);
    const proximoId = idx >= 0 ? secaoOrder[idx + 1] : undefined;
    if (proximoId) secaoRefs.current[proximoId]?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  function alterarComplemento(grupo: ComplementoGrupoVenda, item: ComplementoItemVenda, delta: 1 | -1) {
    const nova = alterarSelecao(selecaoComplementos, grupo, item, delta);
    setSelecaoComplementos(nova);
    if (delta === 1 && grupo.maximo > 0 && qtdNoGrupo(nova, grupo.id) >= grupo.maximo) rolarParaProximaSecao(`complemento-${grupo.id}`);
  }

  function adicionar() {
    if (!produto || !podeAdicionar) return;

    if (!temOpcoes) {
      onAdicionar({
        id: produto.id,
        tipo: "produto",
        nome: produto.nome,
        precoUnit: produto.preco_final,
        qtd,
        obs: obs.trim(),
        imagem: produto.imagem,
        estoqueMax: produto.estoque,
        pontosGanho: produto.pontos_ganho,
      });
    } else if (usandoQtdPorVariacao) {
      /* Um item no carrinho por variacao escolhida, cada um com a sua quantidade. */
      const gruposLabel = gruposSelecionados
        .flatMap((g) => g.itens.map((it) => ` + ${it.nome}`))
        .join("") + rotuloComplementos(complementos, selecaoComplementos);
      const opcoesExtras: { titulo: string; nome: string }[] = [];
      for (const g of gruposSelecionados) {
        for (const it of g.itens) opcoesExtras.push({ titulo: g.grupo.titulo, nome: it.nome });
      }
      for (const { grupo, item, qtd: q } of itensEscolhidos(complementos, selecaoComplementos)) {
        opcoesExtras.push({ titulo: grupo.nome, nome: q > 1 ? `${q}x ${item.nome}` : item.nome });
      }
      for (const v of variacoesEscolhidas) {
        const nomeVariacao = [v.tamanho, v.cor].filter(Boolean).join(" - ");
        onAdicionar({
          id: produto.id,
          tipo: "produto",
          nome: `${produto.nome}${nomeVariacao ? ` - ${nomeVariacao}` : ""}${gruposLabel}`,
          precoUnit: precoBaseDe(v) + adicionaisUnit,
          qtd: qtdVariacoes[v.id] ?? 0,
          obs: obs.trim(),
          imagem: produto.imagem,
          estoqueMax: v.estoque ?? produto.estoque,
          pontosGanho: produto.pontos_ganho,
          variacaoId: v.id,
          selecoesGrupos,
          opcoesSelecionadas: [{ titulo: detalhe?.variacao_titulo ?? "Variações do produto", nome: nomeVariacao || "Opção" }, ...opcoesExtras],
          complementos: complementosParaEnvio(complementos, selecaoComplementos),
        });
      }
    } else {
      const nomeVariacao = variacaoSelecionada ? [variacaoSelecionada.tamanho, variacaoSelecionada.cor].filter(Boolean).join(" - ") : "";
      const gruposLabel = gruposSelecionados
        .flatMap((g) => g.itens.map((it) => ` + ${it.nome}`))
        .join("") + rotuloComplementos(complementos, selecaoComplementos);
      const opcoesSelecionadas: { titulo: string; nome: string }[] = [];
      if (variacaoSelecionada) {
        opcoesSelecionadas.push({ titulo: detalhe?.variacao_titulo ?? "Variações do produto", nome: nomeVariacao || "Opção" });
      }
      for (const g of gruposSelecionados) {
        for (const it of g.itens) opcoesSelecionadas.push({ titulo: g.grupo.titulo, nome: it.nome });
      }
      for (const { grupo, item, qtd: q } of itensEscolhidos(complementos, selecaoComplementos)) {
        opcoesSelecionadas.push({ titulo: grupo.nome, nome: q > 1 ? `${q}x ${item.nome}` : item.nome });
      }
      onAdicionar({
        id: produto.id,
        tipo: "produto",
        nome: `${produto.nome}${nomeVariacao ? ` - ${nomeVariacao}` : ""}${gruposLabel}`,
        precoUnit: precoUnitario,
        qtd,
        obs: obs.trim(),
        imagem: produto.imagem,
        estoqueMax: estoqueVariacao ?? produto.estoque,
        pontosGanho: produto.pontos_ganho,
        variacaoId,
        selecoesGrupos,
        opcoesSelecionadas,
        complementos: complementosParaEnvio(complementos, selecaoComplementos),
      });
    }

    onOpenChange(false);
  }

  const pontosTotal = mostrarPontos ? (produto.pontos_ganho ?? 0) * qtd : 0;

  const obsField = (
    <div className="mb-3">
      <label className="mb-1.5 block text-[.86rem] font-bold text-neutral-900">Alguma observação?</label>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        placeholder="Observações do cliente"
        rows={2}
        className="w-full resize-none rounded-2xl border-[1.5px] border-neutral-200 p-2.5 text-base outline-none"
      />
    </div>
  );

  /* Mesmo campo de observacao, so que achatado — usado so na versao desktop do modal sem
     variacoes (no mobile o campo acima continua igual, no rodape fixo). */
  const obsFieldCompacto = (
    <div>
      <label className="mb-1 block text-[.78rem] font-semibold text-neutral-900">Alguma observação?</label>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        placeholder="Observações do cliente"
        rows={1}
        className="w-full resize-none rounded-2xl border-[1.5px] border-neutral-200 px-3 py-1.5 text-[.88rem] outline-none"
      />
    </div>
  );

  const precoVitrine = (
    <div className="flex justify-end">
      <div className="rounded-xl bg-neutral-100 px-4 py-3 text-[.9rem] font-medium text-neutral-900">
        {formatarPreco(produto.preco_final)}
      </div>
    </div>
  );

  const footer = somenteVisualizar ? precoVitrine : (
    <div>
      {!temOpcoes && <div className="min-[940px]:hidden">{obsField}</div>}
      <div className="flex items-center justify-between gap-3">
        {!usandoQtdPorVariacao && (
          <QtyStepper
            value={qtd}
            min={Math.max(1, produto.quantidade_minima ?? 0)}
            max={estoqueRestante}
            onChange={setQtd}
            onMaxAtingido={avisarEstoqueIndisponivel}
          />
        )}
        <button
          type="button"
          disabled={!podeAdicionar}
          onClick={adicionar}
          className="flex-1 rounded-full py-3.5 text-[.9rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
          style={{ background: podeAdicionar ? brown : temOpcoes ? "#a3a3a3" : "#c0a88a" }}
        >
          {produto.esgotado
            ? "Esgotado"
            : faltaVariacao
              ? "Escolha a quantidade"
              : usandoQtdPorVariacao
                ? `Adicionar ${totalQtdVariacoes} ${totalQtdVariacoes === 1 ? "item" : "itens"} · ${formatarPreco(total)}`
                : `Adicionar ${formatarPreco(total)}`}
        </button>
      </div>
    </div>
  );

  const opcoesConteudo = carregando ? (
    <p className="text-[.86rem] text-neutral-500">Carregando opções...</p>
  ) : erroCarregar ? (
    <p className="text-[.86rem] text-red-600">Não foi possível carregar as opções. Feche e tente novamente.</p>
  ) : (
    <>
      {temVariacoes && (
      <div ref={(el) => { secaoRefs.current["variacao"] = el; }}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[.86rem] font-bold text-neutral-900">{detalhe?.variacao_titulo ?? "Escolha uma das opções"}</h3>
          {variacaoObrigatoria && <span className="text-[.72rem] font-bold text-red-500">Obrigatório</span>}
        </div>
        <p className="mb-1 text-[.76rem] text-neutral-500">Escolha a quantidade de cada opção.</p>
        <div>
          {(detalhe?.variacoes ?? []).map((v) => {
            const qtdV = qtdVariacoes[v.id] ?? 0;
            const esgotada = disponivelVariacao(v) <= 0;
            return (
              <LinhaPassoCombo
                key={v.id}
                nome={[v.tamanho, v.cor].filter(Boolean).join(" - ") || "Opção"}
                detalhe={esgotada && qtdV === 0 ? "Esgotado" : formatarPreco(precoBaseDe(v))}
                apagada={esgotada && qtdV === 0}
                qtd={qtdV}
                podeSomar={qtdV < maxDaVariacao(v, qtdVariacoes)}
                onMenos={() => alterarQtdVariacao(v, -1)}
                onMais={() => alterarQtdVariacao(v, 1)}
                onBloqueado={avisarEstoqueIndisponivel}
              />
            );
          })}
          {detalhe?.variacoes.length === 0 && <p className="py-2 text-[.8rem] text-neutral-400">Sem variações cadastradas.</p>}
        </div>
      </div>
      )}

      {(detalhe?.grupos_opcoes ?? []).map((grupo) => {
        const selecionados = selecoesGrupos[grupo.id] ?? [];
        const atingiuMax = grupo.tipo_selecao === "multipla" && grupo.max_selecao > 0 && selecionados.length >= grupo.max_selecao;
        return (
          <div key={grupo.id} ref={(el) => { secaoRefs.current[`grupo-${grupo.id}`] = el; }} className="mt-4 border-t border-neutral-100 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[.86rem] font-bold text-neutral-900 uppercase">{grupo.titulo}</h3>
              {grupo.obrigatorio === 1 && <span className="text-[.72rem] font-bold text-red-500">Obrigatório</span>}
            </div>
            <p className="mb-1.5 text-[.74rem] text-neutral-500">
              {grupo.tipo_selecao === "multipla"
                ? grupo.max_selecao > 0
                  ? `Escolha até ${grupo.max_selecao} opç${grupo.max_selecao > 1 ? "ões" : "ão"}.`
                  : "Escolha 1 ou mais opções."
                : "Escolha 1 opção."}
            </p>
            {grupo.itens.map((it) => (
              <OpcaoExtra
                key={it.id}
                nome={it.nome}
                preco={it.preco}
                ativo={selecionados.includes(it.id)}
                desabilitado={atingiuMax && !selecionados.includes(it.id)}
                cor={brown}
                onClick={() => alternarOpcao(grupo.id, it.id, grupo.tipo_selecao, grupo.max_selecao)}
              />
            ))}
          </div>
        );
      })}

      {complementos.map((grupo, indice) => {
        const pendente = grupoPendente(grupo, selecaoComplementos);
        const noLimite = grupo.maximo > 0 && qtdNoGrupo(selecaoComplementos, grupo.id) >= grupo.maximo;
        const primeiraSecao = indice === 0 && !temVariacoes && (detalhe?.grupos_opcoes ?? []).length === 0;
        return (
          <div
            key={`complemento-${grupo.id}`}
            ref={(el) => { secaoRefs.current[`complemento-${grupo.id}`] = el; }}
            className={primeiraSecao ? "" : "mt-4 border-t border-neutral-100 pt-3"}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[.86rem] font-bold text-neutral-900 uppercase">{grupo.nome}</h3>
              {(grupo.obrigatorio || grupo.minimo > 0) && (
                <span className={`text-[.72rem] font-bold ${pendente ? "text-red-500" : "text-emerald-600"}`}>{pendente ? "Obrigatório" : "Ok"}</span>
              )}
            </div>
            <p className="mb-1.5 text-[.74rem] text-neutral-500">{dicaDoGrupo(grupo)}</p>
            {grupo.itens.map((it) => (
              <LinhaComplemento
                key={it.id}
                item={it}
                qtd={selecaoComplementos[grupo.id]?.[it.id] ?? 0}
                escolhaUnica={grupo.maximo === 1}
                noLimite={noLimite}
                cor={brown}
                nomeRadio={`complemento-${grupo.id}`}
                onAlterar={(delta) => alterarComplemento(grupo, it, delta)}
              />
            ))}
          </div>
        );
      })}
    </>
  );

  if (temOpcoes && !desktop) {
    /* Celular — variacoes e complementos: mesmo visual do StoreComboDialog — passos com cabecalho cinza e
       cada opcao com contador (e foto, nos complementos). */
    const tituloVariacao = detalhe?.variacao_titulo?.trim() || "Escolha uma das opções";
    const grupoAntigoFaltando = temVariacoes
      ? (detalhe?.grupos_opcoes ?? []).find((g) => g.obrigatorio === 1 && (selecoesGrupos[g.id]?.length ?? 0) === 0)
      : undefined;
    const pendente = faltaVariacao
      ? tituloVariacao
      : (grupoAntigoFaltando?.titulo ?? complementos.find((g) => grupoPendente(g, selecaoComplementos))?.nome);
    return (
      <StoreSheet
        open={open}
        onOpenChange={onOpenChange}
        maxWidth={613}
        footer={
          somenteVisualizar ? precoVitrine : (
          <div className="flex items-center justify-between gap-3">
            {!usandoQtdPorVariacao && (
              <QtyStepper
                value={qtd}
                min={Math.max(1, produto.quantidade_minima ?? 0)}
                max={estoqueRestante}
                onChange={setQtd}
                onMaxAtingido={avisarEstoqueIndisponivel}
              />
            )}
            <button
              type="button"
              disabled={!podeAdicionar}
              onClick={adicionar}
              className="flex-1 rounded-full py-3.5 text-[.9rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
              style={{ background: podeAdicionar ? brown : "#c0a88a" }}
            >
              {produto.esgotado
                ? "Esgotado"
                : pendente
                  ? `Selecione "${pendente}"`
                  : usandoQtdPorVariacao
                    ? `Adicionar ${totalQtdVariacoes} ${totalQtdVariacoes === 1 ? "item" : "itens"} · ${formatarPreco(total)}`
                    : `Adicionar ${formatarPreco(total)}`}
            </button>
          </div>
          )
        }
      >
        <div className="p-4">
          <div
            className={`group relative mb-3 w-full overflow-hidden rounded-xl bg-neutral-100 sm:max-h-[280px] ${
              imagemAmpliada ? "" : "h-[190px]"
            }`}
            style={imagemAmpliada ? { aspectRatio: aspectRatio ?? 4 / 3 } : undefined}
          >
            <button
              type="button"
              onClick={() => setImagemAmpliada((v) => !v)}
              className={`block size-full ${imagemAmpliada ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={produto.imagem || PRODUTO_IMAGEM_PADRAO}
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
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
              className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-neutral-600"
            >
              <X size={14} />
            </button>
          </div>
          <h2 className="mb-1 text-[.95rem] font-bold text-neutral-900">{produto.nome}</h2>
          {produto.descricao && <p className="mb-2.5 text-[.76rem] leading-relaxed text-neutral-500">{produto.descricao}</p>}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {temVariacoes ? (
              <span className="text-[1rem] font-bold text-neutral-900">a partir de {formatarPreco(produto.preco_produto)}</span>
            ) : produto.em_promo ? (
              <div className="flex items-center gap-2">
                <span className="text-[.8rem] text-neutral-400 line-through">{formatarPreco(produto.preco_base)}</span>
                <span className="text-[1rem] font-bold text-emerald-600">{formatarPreco(produto.preco_final)}</span>
              </div>
            ) : (
              <span className="text-[1rem] font-bold text-neutral-900">{formatarPreco(produto.preco_final)}</span>
            )}
            <PontosBadge pontos={pontosTotal} />
          </div>
          {produto.esgotado && <p className="mb-3 text-[.86rem] font-medium text-red-600">Produto esgotado no momento.</p>}

          {carregando ? (
            <p className="text-[.86rem] text-neutral-500">Carregando opções...</p>
          ) : erroCarregar ? (
            <p className="text-[.86rem] text-red-600">Não foi possível carregar as opções. Feche e tente novamente.</p>
          ) : (
            <div className="space-y-3">
              {temVariacoes && (
                <div
                  ref={(el) => {
                    secaoRefs.current["variacao"] = el;
                  }}
                >
                  <CabecalhoPasso titulo={tituloVariacao} obrigatorio={variacaoObrigatoria} dica="Escolha a quantidade de cada opção." />
                  <div>
                    {(detalhe?.variacoes ?? []).map((v) => {
                      const qtdV = qtdVariacoes[v.id] ?? 0;
                      const esgotada = disponivelVariacao(v) <= 0;
                      return (
                        <LinhaPassoCombo
                          key={v.id}
                          nome={[v.tamanho, v.cor].filter(Boolean).join(" - ") || "Opção"}
                          detalhe={esgotada && qtdV === 0 ? "Esgotado" : formatarPreco(precoBaseDe(v))}
                          apagada={esgotada && qtdV === 0}
                          qtd={qtdV}
                          podeSomar={qtdV < maxDaVariacao(v, qtdVariacoes)}
                          onMenos={() => alterarQtdVariacao(v, -1)}
                          onMais={() => alterarQtdVariacao(v, 1)}
                          onBloqueado={avisarEstoqueIndisponivel}
                        />
                      );
                    })}
                    {detalhe?.variacoes.length === 0 && <p className="py-2 text-[.8rem] text-neutral-400">Sem variações cadastradas.</p>}
                  </div>
                </div>
              )}

              {(detalhe?.grupos_opcoes ?? []).map((grupo) => {
                const selecionados = selecoesGrupos[grupo.id] ?? [];
                const atingiuMax = grupo.tipo_selecao === "multipla" && grupo.max_selecao > 0 && selecionados.length >= grupo.max_selecao;
                return (
                  <div
                    key={`grupo-${grupo.id}`}
                    ref={(el) => {
                      secaoRefs.current[`grupo-${grupo.id}`] = el;
                    }}
                  >
                    <CabecalhoPasso
                      titulo={grupo.titulo}
                      obrigatorio={grupo.obrigatorio === 1}
                      dica={
                        grupo.tipo_selecao === "multipla"
                          ? grupo.max_selecao > 0
                            ? `Escolha até ${grupo.max_selecao} opç${grupo.max_selecao > 1 ? "ões" : "ão"}.`
                            : "Escolha 1 ou mais opções."
                          : "Escolha 1 opção."
                      }
                    />
                    <div>
                      {grupo.itens.map((it) => {
                        const ativo = selecionados.includes(it.id);
                        return (
                          <LinhaPassoCombo
                            key={it.id}
                            nome={it.nome}
                            detalhe={it.preco > 0 ? `+ ${formatarPreco(it.preco)}` : "Sem custo adicional"}
                            apagada={atingiuMax && !ativo}
                            qtd={ativo ? 1 : 0}
                            podeSomar={!ativo && !atingiuMax}
                            onMenos={() => alternarOpcao(grupo.id, it.id, grupo.tipo_selecao, grupo.max_selecao)}
                            onMais={() => alternarOpcao(grupo.id, it.id, grupo.tipo_selecao, grupo.max_selecao)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {complementos.map((grupo) => {
                const noLimite = grupo.maximo > 0 && qtdNoGrupo(selecaoComplementos, grupo.id) >= grupo.maximo;
                return (
                  <div
                    key={grupo.id}
                    ref={(el) => {
                      secaoRefs.current[`complemento-${grupo.id}`] = el;
                    }}
                  >
                    <CabecalhoPasso titulo={grupo.nome} obrigatorio={grupo.obrigatorio || grupo.minimo > 0} dica={dicaDoGrupo(grupo)} />
                    <div>
                      {grupo.itens.map((it) => (
                        <LinhaComplementoCombo
                          key={it.id}
                          item={it}
                          qtd={selecaoComplementos[grupo.id]?.[it.id] ?? 0}
                          escolhaUnica={grupo.maximo === 1}
                          noLimite={noLimite}
                          onAlterar={(delta) => alterarComplemento(grupo, it, delta)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5">
            <label className="mb-1.5 block text-[.8rem] font-bold text-neutral-900">Alguma observação?</label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Observações do cliente"
              rows={2}
              className="w-full resize-none rounded-[10px] border-[1.5px] border-neutral-200 p-2.5 text-base outline-none"
            />
          </div>
        </div>
      </StoreSheet>
    );
  }

  if (temOpcoes) {
    /* Dialogo centralizado igual ao varModalLoja do sistema legado: imagem a esquerda
       (topo no mobile) e opcoes rolando ao lado; observacao e rodape fixos embaixo. */
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[92dvh] w-[calc(100%-24px)] max-w-[460px] flex-col gap-0 overflow-hidden rounded-[20px] bg-white p-0 shadow-[0_24px_60px_rgba(0,0,0,.3)] sm:max-w-[460px] min-[940px]:h-[min(597px,calc(100dvh-24px))] min-[940px]:max-h-[597px] min-[940px]:w-[900px]! min-[940px]:max-w-[900px]!"
        >
          <DialogTitle className="sr-only">{produto.nome}</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="absolute top-3 right-3 z-10 flex size-7 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/35"
          >
            <X size={15} />
          </button>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto min-[940px]:overflow-hidden">
            <div className="flex flex-col min-[940px]:min-h-0 min-[940px]:flex-1 min-[940px]:flex-row min-[940px]:items-stretch">
              <div className="aspect-[16/11] w-full shrink-0 min-[940px]:aspect-auto min-[940px]:w-[380px] min-[940px]:py-6 min-[940px]:pl-6">
                <div className="size-full overflow-hidden bg-neutral-100 min-[940px]:rounded-2xl">
                  {
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={produto.imagem || PRODUTO_IMAGEM_PADRAO} alt="" className="size-full object-cover" />
                  }
                </div>
              </div>
              <div className="min-w-0 px-[18px] pt-4 pb-1 min-[940px]:flex-1 min-[940px]:overflow-y-auto min-[940px]:px-8 min-[940px]:pt-7">
                <h2 className="mb-1 pr-8 text-[1rem] leading-tight font-bold text-neutral-900 min-[940px]:pr-10">
                  {produto.nome}
                </h2>
                {produto.descricao && <p className="mb-2 text-[.8rem] leading-normal text-neutral-500">{produto.descricao}</p>}
                <p className="mb-3.5 flex items-center gap-2 text-[.86rem] font-bold text-neutral-900">
                  {temVariacoes ? `a partir de ${formatarPreco(produto.preco_produto)}` : formatarPreco(produto.preco_final)}
                  <PontosBadge pontos={pontosTotal} />
                </p>
                {opcoesConteudo}
              </div>
            </div>
            <div className={`border-t border-neutral-100 px-4 pt-2 pb-2.5 ${somenteVisualizar ? "hidden" : ""}`}>
              <label className="mb-1.5 block text-[.82rem] font-semibold text-neutral-900">Alguma observação?</label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Observações do cliente"
                rows={1}
                className="w-full resize-none rounded-2xl border-[1.5px] border-neutral-200 px-3 py-2 text-base outline-none"
              />
            </div>
          </div>
          <div className="shrink-0 border-t border-neutral-100 px-4 py-3">{footer}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <StoreSheet
      open={open}
      onOpenChange={onOpenChange}
      footer={footer}
      maxWidth={900}
      contentClassName="min-[940px]:top-1/2! min-[940px]:-translate-y-1/2! min-[940px]:h-[min(597px,calc(100dvh-24px))]! min-[940px]:max-h-[597px]! min-[940px]:w-[900px]! min-[940px]:max-w-[900px]! min-[940px]:rounded-[20px]! min-[940px]:shadow-[0_24px_60px_rgba(0,0,0,.3)]!"
    >
      {/* No mobile continua o mesmo "sheet" de tela cheia de sempre. No desktop (min-[940px]),
          via contentClassName acima, o modal vira um cartao flutuante centralizado — foto numa
          coluna fixa a esquerda, informacoes numa coluna flexivel a direita. */}
      <div className="relative p-4 min-[940px]:flex min-[940px]:h-full min-[940px]:flex-col min-[940px]:p-6">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-10 hidden size-7 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/35 min-[940px]:flex"
        >
          <X size={15} />
        </button>
        <div className="min-[940px]:flex min-[940px]:min-h-0 min-[940px]:flex-1 min-[940px]:items-stretch min-[940px]:gap-6">
          <div
            className={`group relative mb-3 w-full overflow-hidden rounded-xl bg-neutral-100 sm:max-h-[280px] min-[940px]:mb-0 min-[940px]:aspect-auto! min-[940px]:h-[385px]! min-[940px]:w-[357px] min-[940px]:max-h-none! min-[940px]:shrink-0 min-[940px]:rounded-2xl ${
              imagemAmpliada ? "" : "h-[190px]"
            }`}
            style={imagemAmpliada ? { aspectRatio: aspectRatio ?? 4 / 3 } : undefined}
          >
            <button
              type="button"
              onClick={() => setImagemAmpliada((v) => !v)}
              className={`block size-full ${imagemAmpliada ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={produto.imagem || PRODUTO_IMAGEM_PADRAO}
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
              className="absolute right-2 bottom-2 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[.72rem] font-semibold text-white min-[940px]:hidden"
            >
              {imagemAmpliada ? <Shrink size={12} /> : <Expand size={12} />}
              {imagemAmpliada ? "Recolher" : "Ver maior"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-neutral-600 min-[940px]:hidden"
            >
              <X size={14} />
            </button>
          </div>
          <div className="min-w-0 min-[940px]:flex-1 min-[940px]:overflow-y-auto min-[940px]:pt-1">
            <h2 className="mb-1.5 text-[1rem] font-bold text-neutral-900 min-[940px]:text-[1.15rem]">{produto.nome}</h2>
            {produto.descricao && <p className="mb-2.5 text-[.8rem] leading-relaxed text-neutral-500">{produto.descricao}</p>}
            <div className="mb-3.5 flex flex-wrap items-center gap-2">
              {produto.em_promo ? (
                <div className="flex items-center gap-2">
                  <span className="text-[.85rem] text-neutral-400 line-through">{formatarPreco(produto.preco_base)}</span>
                  <span className="text-[1.05rem] font-bold text-emerald-600">{formatarPreco(produto.preco_final)}</span>
                </div>
              ) : (
                <span className="text-[1.05rem] font-bold text-neutral-900">{formatarPreco(produto.preco_final)}</span>
              )}
              <PontosBadge pontos={pontosTotal} />
            </div>
            {produto.esgotado && <p className="mb-3 text-[.86rem] font-medium text-red-600">Produto esgotado no momento.</p>}
          </div>
        </div>
        <div className={`hidden min-[940px]:mt-2 min-[940px]:border-t min-[940px]:border-neutral-100 min-[940px]:pt-2 ${somenteVisualizar ? "" : "min-[940px]:block"}`}>
          {obsFieldCompacto}
        </div>
      </div>
    </StoreSheet>
  );
}

/** Cabecalho cinza de cada passo, igual ao do combo. */
function CabecalhoPasso({ titulo, obrigatorio, dica }: { titulo: string; obrigatorio: boolean; dica: string }) {
  return (
    <div className="mb-1 rounded-[10px] bg-neutral-100 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5 text-[.8rem] font-bold text-neutral-900">
        {titulo}
        {obrigatorio && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[.62rem] font-bold text-amber-700">Obrigatório</span>}
      </div>
      <p className="mt-0.5 text-[.68rem] text-neutral-500">{dica}</p>
    </div>
  );
}

/**
 * Opcao no visual do combo: nome, detalhe (preco/esgotado), foto opcional e contador (- qtd +).
 * imagem undefined = sem espaco de foto (variacoes e itens sem foto anexada).
 */
function LinhaPassoCombo({
  nome,
  descricao,
  detalhe,
  imagem,
  apagada,
  qtd,
  podeSomar,
  onMenos,
  onMais,
  onBloqueado,
}: {
  nome: string;
  descricao?: string | null;
  detalhe: string;
  imagem?: string | null;
  apagada: boolean;
  qtd: number;
  podeSomar: boolean;
  onMenos: () => void;
  onMais: () => void;
  /** Clique no "+" travado (ex.: avisar falta de estoque). */
  onBloqueado?: () => void;
}) {
  return (
    <div className={`flex items-center gap-2.5 border-b border-neutral-100 py-2 last:border-0 ${apagada ? "opacity-55" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="text-[.95rem] leading-tight text-neutral-900">{nome}</div>
        {descricao && <div className="mt-0.5 text-[.8rem] leading-snug text-neutral-500">{descricao}</div>}
        <div className="mt-0.5 text-[.82rem] text-neutral-400">{detalhe}</div>
      </div>
      {imagem !== undefined && (
        <div className="size-[64px] shrink-0 overflow-hidden rounded-xl bg-neutral-100">
          {imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagem} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-neutral-300">
              <ImageIcon size={20} />
            </div>
          )}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={qtd <= 0}
          onClick={onMenos}
          aria-label={`Remover ${nome}`}
          className="flex size-8 items-center justify-center text-neutral-600 hover:text-neutral-900 disabled:text-neutral-300"
        >
          <Minus size={20} />
        </button>
        <span className="min-w-[22px] px-0.5 text-center text-[.95rem] font-medium text-neutral-900">{qtd}</span>
        <button
          type="button"
          aria-disabled={!podeSomar}
          onClick={() => (podeSomar ? onMais() : onBloqueado?.())}
          aria-label={`Adicionar ${nome}`}
          className={`flex size-8 items-center justify-center text-neutral-600 hover:text-neutral-900 ${!podeSomar ? "text-neutral-300" : ""}`}
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

/** Item de complemento no visual do combo. Em grupo de escolha unica o "+" de outro item troca a opcao. */
function LinhaComplementoCombo({
  item,
  qtd,
  escolhaUnica,
  noLimite,
  onAlterar,
}: {
  item: ComplementoItemVenda;
  qtd: number;
  escolhaUnica: boolean;
  noLimite: boolean;
  onAlterar: (delta: 1 | -1) => void;
}) {
  const esgotado = item.estoque !== null && item.estoque <= 0;
  const semEstoqueParaMais = item.estoque !== null && qtd >= item.estoque;
  const podeSomar = escolhaUnica
    ? !esgotado && qtd === 0
    : !esgotado && !noLimite && (item.podeRepetir || qtd === 0) && !semEstoqueParaMais;

  return (
    <LinhaPassoCombo
      nome={item.nome}
      descricao={item.descricao}
      detalhe={esgotado ? "Esgotado" : item.preco > 0 ? `+ ${formatarPreco(item.preco)}` : "Sem custo adicional"}
      imagem={item.imagem || undefined}
      apagada={esgotado && qtd === 0}
      qtd={qtd}
      podeSomar={podeSomar}
      onMenos={() => onAlterar(-1)}
      onMais={() => onAlterar(1)}
      onBloqueado={() => {
        if (!esgotado && semEstoqueParaMais) avisarEstoqueIndisponivel();
      }}
    />
  );
}

/** Linha de extra/tipo com botão "+" que vira check preto quando selecionado (igual ao loja.php legado). */
function OpcaoExtra({
  nome,
  preco,
  ativo,
  desabilitado = false,
  cor,
  onClick,
}: {
  nome: string;
  preco: number;
  ativo: boolean;
  /** Limite de selecao do grupo atingido e este item nao esta entre os escolhidos — fica visivelmente travado. */
  desabilitado?: boolean;
  cor: string;
  onClick: () => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 border-t border-neutral-100 py-3 first:border-t-0 ${desabilitado ? "opacity-40" : ""}`}>
      <div className="text-base text-neutral-900">
        {nome}
        <small className="mt-0.5 block text-[.8rem] font-semibold text-neutral-400">{formatarPreco(preco)}</small>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={desabilitado}
        aria-pressed={ativo}
        className="flex size-8 shrink-0 items-center justify-center rounded-[10px] text-white disabled:cursor-not-allowed"
        style={{ background: ativo ? "#171717" : cor }}
      >
        {ativo ? <Check size={15} /> : <Plus size={15} />}
      </button>
    </div>
  );
}

/**
 * Item de complemento na loja: escolha unica vira radio; nos demais o "+" adiciona e, se o item
 * pode repetir, aparece o contador (- qtd +) no lugar do botao.
 */
function LinhaComplemento({
  item,
  qtd,
  escolhaUnica,
  noLimite,
  cor,
  nomeRadio,
  onAlterar,
}: {
  item: ComplementoItemVenda;
  qtd: number;
  escolhaUnica: boolean;
  /** O grupo ja chegou no maximo de escolhas. */
  noLimite: boolean;
  cor: string;
  nomeRadio: string;
  onAlterar: (delta: 1 | -1) => void;
}) {
  const esgotado = item.estoque !== null && item.estoque <= 0;
  const ativo = qtd > 0;
  const podeSomar = !esgotado && !noLimite && (item.podeRepetir || qtd === 0) && (item.estoque === null || qtd < item.estoque);
  const travado = !ativo && (esgotado || (noLimite && !escolhaUnica));

  const texto = (
    <div className="text-base text-neutral-900">
      {item.nome}
      <small className="mt-0.5 block text-[.8rem] font-semibold text-neutral-400">{esgotado ? "Esgotado" : formatarPreco(item.preco)}</small>
    </div>
  );

  if (escolhaUnica) {
    return (
      <label
        className={`flex items-center justify-between gap-3 border-t border-neutral-100 py-3 first:border-t-0 ${
          esgotado && !ativo ? "cursor-not-allowed opacity-40" : "cursor-pointer"
        }`}
      >
        {texto}
        <input
          type="radio"
          name={nomeRadio}
          checked={ativo}
          disabled={esgotado && !ativo}
          onChange={() => onAlterar(1)}
          onClick={() => ativo && onAlterar(1)}
          className="size-[18px] shrink-0"
          style={{ accentColor: cor }}
        />
      </label>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-3 border-t border-neutral-100 py-3 first:border-t-0 ${travado ? "opacity-40" : ""}`}>
      {texto}
      {ativo && item.podeRepetir ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onAlterar(-1)}
            aria-label={`Remover um ${item.nome}`}
            className="flex size-8 items-center justify-center rounded-[10px] bg-neutral-100 text-neutral-900"
          >
            <Minus size={15} />
          </button>
          <span className="w-4 text-center text-[.9rem] font-bold tabular-nums">{qtd}</span>
          <button
            type="button"
            onClick={() => onAlterar(1)}
            disabled={!podeSomar}
            aria-label={`Adicionar mais um ${item.nome}`}
            className="flex size-8 items-center justify-center rounded-[10px] text-white disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: cor }}
          >
            <Plus size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onAlterar(ativo ? -1 : 1)}
          disabled={!ativo && !podeSomar}
          aria-pressed={ativo}
          aria-label={ativo ? `Remover ${item.nome}` : `Adicionar ${item.nome}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-[10px] text-white disabled:cursor-not-allowed"
          style={{ background: ativo ? "#171717" : cor }}
        >
          {ativo ? <Check size={15} /> : <Plus size={15} />}
        </button>
      )}
    </div>
  );
}
