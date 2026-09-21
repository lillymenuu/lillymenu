"use client";

import { trackStoreEvento } from "@/lib/store/tracking";
import { useCallback, useEffect, useState } from "react";
import type { StoreCartItem } from "@/lib/store/types";

function storageKey(lojaId: number): string {
  return `lillymenu_store_cart_${lojaId}`;
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
      const idxExistente = atual.findIndex((i) => i.id === item.id && i.tipo === item.tipo && i.obs === item.obs);
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
