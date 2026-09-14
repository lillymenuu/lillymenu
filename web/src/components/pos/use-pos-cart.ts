"use client";

import { useCallback, useMemo, useState } from "react";
import type { PosCartItem } from "@/lib/pos";

export function usePosCart() {
  const [itens, setItens] = useState<PosCartItem[]>([]);

  const adicionar = useCallback((item: Omit<PosCartItem, "rowKey"> & { rowKey?: string }) => {
    setItens((prev) => {
      const rowKey = item.rowKey ?? `${item.produtoId ?? "avulso"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const existente = item.rowKey ? prev.find((i) => i.rowKey === item.rowKey) : null;
      if (existente) {
        return prev.map((i) => (i.rowKey === item.rowKey ? { ...i, qtd: i.qtd + item.qtd } : i));
      }
      return [...prev, { ...item, rowKey }];
    });
  }, []);

  const remover = useCallback((rowKey: string) => {
    setItens((prev) => prev.filter((i) => i.rowKey !== rowKey));
  }, []);

  const alterarQtd = useCallback((rowKey: string, qtd: number) => {
    setItens((prev) => (qtd <= 0 ? prev.filter((i) => i.rowKey !== rowKey) : prev.map((i) => (i.rowKey === rowKey ? { ...i, qtd } : i))));
  }, []);

  const alterarObservacoes = useCallback((rowKey: string, observacoes: string) => {
    setItens((prev) => prev.map((i) => (i.rowKey === rowKey ? { ...i, observacoes } : i)));
  }, []);

  const atualizarItem = useCallback((rowKey: string, dados: Partial<Omit<PosCartItem, "rowKey">>) => {
    setItens((prev) => prev.map((i) => (i.rowKey === rowKey ? { ...i, ...dados } : i)));
  }, []);

  const limpar = useCallback(() => setItens([]), []);

  const subtotal = useMemo(() => itens.reduce((s, i) => s + i.preco * i.qtd, 0), [itens]);

  return { itens, adicionar, remover, alterarQtd, alterarObservacoes, atualizarItem, limpar, subtotal };
}

export type UsePosCartReturn = ReturnType<typeof usePosCart>;
