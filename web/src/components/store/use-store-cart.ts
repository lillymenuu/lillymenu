"use client";

import { trackStoreEvento } from "@/lib/store/tracking";
import { useCallback, useEffect, useState } from "react";
import type { StoreCartItem } from "@/lib/store/types";

function storageKey(lojaId: number): string {
  return `lillymenu_store_cart_${lojaId}`;
}

function assinaturaSelecoesGrupos(selecoes?: Record<number, number[]>): string {
  if (!selecoes) return "";
  return Object.entries(selecoes)
    .map(([grupoId, ids]) => `${grupoId}:${[...ids].sort((a, b) => a - b).join(",")}`)
    .sort()
    .join("|");
}

function assinaturaCombosels(combosels?: { id: number; qtd: number }[]): string {
  if (!combosels) return "";
  return [...combosels]
    .map((s) => `${s.id}:${s.qtd}`)
    .sort()
    .join("|");
}

/* Identidade da linha do carrinho pra decidir se um item novo soma na quantidade de uma
   linha existente ou vira uma linha a parte — precisa incluir variacao/grupos de opcoes e
   combosels, nao so id/tipo/obs: dois pedidos do MESMO produto com coberturas diferentes
   (ex.: um acai com Creme de Ninho, outro com Creme de Morango) tem o mesmo id/tipo/obs,
   mas sao composicoes diferentes — sem isso, o segundo so somava na quantidade do primeiro
   e a composicao escolhida nele desaparecia do carrinho. */
function assinaturaItem(item: Omit<StoreCartItem, "key" | "qtd">): string {
  return [item.id, item.tipo, item.obs ?? "", item.variacaoId ?? "", assinaturaSelecoesGrupos(item.selecoesGrupos), assinaturaCombosels(item.combosels)].join("::");
}

export function useStoreCart(lojaId: number) {
  const [itens, setItens] = useState<StoreCartItem[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(lojaId));
      if (raw) setItens(JSON.parse(raw));
    } catch {
      // localStorage indisponivel (janela privada etc.) — carrinho comeca vazio
    }
    setCarregado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId]);

  useEffect(() => {
    if (!carregado) return;
    try {
      localStorage.setItem(storageKey(lojaId), JSON.stringify(itens));
    } catch {
      // ignora — carrinho segue funcionando so na memoria da sessao
    }
  }, [itens, lojaId, carregado]);

  const adicionar = useCallback((item: Omit<StoreCartItem, "key">) => {
    trackStoreEvento(lojaId, "carrinho");
    setItens((atual) => {
      const assinaturaNova = assinaturaItem(item);
      const idxExistente = atual.findIndex((i) => assinaturaItem(i) === assinaturaNova);
      if (idxExistente >= 0) {
        return atual.map((i, idx) => {
          if (idx !== idxExistente) return i;
          const teto = i.estoqueMax ?? item.estoqueMax;
          const soma = i.qtd + item.qtd;
          return { ...i, qtd: teto !== undefined ? Math.min(soma, Math.max(i.qtd, teto)) : soma };
        });
      }
      return [...atual, { ...item, key: `${Date.now()}_${Math.random().toString(36).slice(2)}` }];
    });
  }, [lojaId]);

  const atualizarQtd = useCallback((key: string, qtd: number) => {
    setItens((atual) =>
      qtd <= 0 ? atual.filter((i) => i.key !== key) : atual.map((i) => (i.key === key ? { ...i, qtd } : i))
    );
  }, []);

  const remover = useCallback((key: string) => {
    setItens((atual) => atual.filter((i) => i.key !== key));
  }, []);

  const limpar = useCallback(() => setItens([]), []);

  const subtotal = itens.reduce((acc, i) => acc + i.precoUnit * i.qtd, 0);
  const totalItens = itens.reduce((acc, i) => acc + i.qtd, 0);

  return { itens, carregado, adicionar, atualizarQtd, remover, limpar, subtotal, totalItens };
}
