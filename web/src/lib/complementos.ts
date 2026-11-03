/*
 * Complementos na venda (PDV e loja): tipos compartilhados entre servidor e cliente e as
 * regras da selecao (minimo/maximo por grupo, preco e rotulo do item no carrinho).
 */

export type ComplementoItemVenda = {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  podeRepetir: boolean;
  imagem: string | null;
  /** Saldo do estoque vinculado; null = item sem controle de estoque. */
  estoque: number | null;
};

export type ComplementoGrupoVenda = {
  id: number;
  nome: string;
  obrigatorio: boolean;
  /** 0 = sem minimo. */
  minimo: number;
  /** 0 = sem limite. */
  maximo: number;
  itens: ComplementoItemVenda[];
};

/** Escolha do cliente: quantidade por item, agrupada por grupo. */
export type SelecaoComplementos = Record<number, Record<number, number>>;

/** Formato enviado ao servidor junto do item do carrinho. */
export type ComplementoEscolhido = { id: number; qtd: number };

export function qtdNoGrupo(selecao: SelecaoComplementos, grupoId: number): number {
  return Object.values(selecao[grupoId] ?? {}).reduce((s, q) => s + q, 0);
}

/** Minimo efetivo: obrigatorio sem minimo configurado vale 1. */
export function minimoDoGrupo(grupo: ComplementoGrupoVenda): number {
  return Math.max(grupo.minimo, grupo.obrigatorio ? 1 : 0);
}

export function grupoPendente(grupo: ComplementoGrupoVenda, selecao: SelecaoComplementos): boolean {
  return qtdNoGrupo(selecao, grupo.id) < minimoDoGrupo(grupo);
}

export function dicaDoGrupo(grupo: ComplementoGrupoVenda): string {
  const min = minimoDoGrupo(grupo);
  const max = grupo.maximo;
  const opcoes = (n: number) => `${n} ${n === 1 ? "opção" : "opções"}`;
  if (max > 0 && min === max) return `Escolha ${opcoes(max)}.`;
  if (max > 0 && min > 0) return `Escolha de ${min} a ${opcoes(max)}.`;
  if (max > 0) return `Escolha até ${opcoes(max)}.`;
  if (min > 0) return `Escolha pelo menos ${opcoes(min)}.`;
  return "Escolha quantas opções quiser.";
}

/**
 * Nova quantidade do item depois de um clique. Grupo de escolha unica (maximo 1) troca a
 * opcao; nos demais respeita o maximo do grupo, o "pode repetir" e o estoque do item.
 */
export function alterarSelecao(selecao: SelecaoComplementos, grupo: ComplementoGrupoVenda, item: ComplementoItemVenda, delta: 1 | -1): SelecaoComplementos {
  const doGrupo = { ...(selecao[grupo.id] ?? {}) };
  const atual = doGrupo[item.id] ?? 0;

  if (delta === 1 && grupo.maximo === 1) {
    return { ...selecao, [grupo.id]: atual > 0 ? {} : { [item.id]: 1 } };
  }

  if (delta === 1) {
    if (grupo.maximo > 0 && qtdNoGrupo(selecao, grupo.id) >= grupo.maximo) return selecao;
    if (!item.podeRepetir && atual >= 1) return selecao;
    if (item.estoque !== null && atual >= item.estoque) return selecao;
    doGrupo[item.id] = atual + 1;
  } else {
    if (atual <= 1) delete doGrupo[item.id];
    else doGrupo[item.id] = atual - 1;
  }
  return { ...selecao, [grupo.id]: doGrupo };
}

export function precoComplementos(grupos: ComplementoGrupoVenda[], selecao: SelecaoComplementos): number {
  let total = 0;
  for (const g of grupos) for (const it of g.itens) total += it.preco * (selecao[g.id]?.[it.id] ?? 0);
  return total;
}

/** Itens escolhidos, na ordem dos grupos — base do payload, do rotulo e do resumo no carrinho. */
export function itensEscolhidos(grupos: ComplementoGrupoVenda[], selecao: SelecaoComplementos) {
  const lista: { grupo: ComplementoGrupoVenda; item: ComplementoItemVenda; qtd: number }[] = [];
  for (const g of grupos) {
    for (const it of g.itens) {
      const qtd = selecao[g.id]?.[it.id] ?? 0;
      if (qtd > 0) lista.push({ grupo: g, item: it, qtd });
    }
  }
  return lista;
}

/** " + Nutella, 2x Morangos" — sufixo do nome do item no carrinho/pedido. */
export function rotuloComplementos(grupos: ComplementoGrupoVenda[], selecao: SelecaoComplementos): string {
  const nomes = itensEscolhidos(grupos, selecao).map(({ item, qtd }) => (qtd > 1 ? `${qtd}x ${item.nome}` : item.nome));
  return nomes.length > 0 ? ` + ${nomes.join(", ")}` : "";
}

export function complementosParaEnvio(grupos: ComplementoGrupoVenda[], selecao: SelecaoComplementos): ComplementoEscolhido[] {
  return itensEscolhidos(grupos, selecao).map(({ item, qtd }) => ({ id: item.id, qtd }));
}

/** Reconstroi a selecao a partir do que foi enviado/gravado (ex.: editar item ja no carrinho). */
export function selecaoDeEscolhidos(grupos: ComplementoGrupoVenda[], escolhidos: ComplementoEscolhido[] | null | undefined): SelecaoComplementos {
  const selecao: SelecaoComplementos = {};
  for (const e of escolhidos ?? []) {
    const grupo = grupos.find((g) => g.itens.some((it) => it.id === e.id));
    if (grupo) selecao[grupo.id] = { ...(selecao[grupo.id] ?? {}), [e.id]: e.qtd };
  }
  return selecao;
}

/** Assinatura estavel (para juntar linhas iguais no carrinho). */
export function assinaturaComplementos(escolhidos: ComplementoEscolhido[] | null | undefined): string {
  return (escolhidos ?? [])
    .map((e) => `${e.id}x${e.qtd}`)
    .sort()
    .join(",");
}
