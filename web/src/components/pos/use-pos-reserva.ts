"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PosCartItem } from "@/lib/pos";

const HEARTBEAT_MS = 30_000; // o servidor ignora reservas sem novo sinal ha 90s
const DEBOUNCE_MS = 600;

type ItemReserva = { produto_id: number; qtd: number };

/** Unidades por produto que o carrinho vai consumir (componentes de combo contam pelo produto de cada opcao). */
function itensDoCarrinho(itens: PosCartItem[]): ItemReserva[] {
  const soma = new Map<number, number>();
  const somar = (id: number, q: number) => soma.set(id, (soma.get(id) ?? 0) + q);
  for (const item of itens) {
    if (item.combosels?.length) {
      for (const sel of item.combosels) somar(sel.id, sel.qtd * item.qtd);
    } else if (item.produtoId) {
      somar(item.produtoId, item.qtd);
    }
  }
  return [...soma.entries()].map(([produto_id, qtd]) => ({ produto_id, qtd })).sort((a, b) => a.produto_id - b.produto_id);
}

function gerarSessao() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now()}${Math.random().toString(36).slice(2)}`;
}

/**
 * Enquanto o operador monta o pedido no balcao, avisa o servidor do que esta no Resumo do pedido pra
 * loja publica descontar essas unidades do estoque (ver admin/helpers/pdv_reserva_module.php). Reenvia
 * a cada 30s enquanto houver itens; ao esvaziar/fechar o PDV libera. `pausado` (ex.: editando um pedido
 * ja lancado, cujo estoque ja foi baixado) nao reserva nada.
 */
export function usePosReservaEstoque(itens: PosCartItem[], pausado = false) {
  const [sessao] = useState(gerarSessao);

  const payload = useMemo(() => (pausado ? [] : itensDoCarrinho(itens)), [itens, pausado]);
  const payloadRef = useRef<ItemReserva[]>(payload);
  const ultimoEnviadoRef = useRef<string>("[]");

  const enviar = useCallback(
    (lista: ItemReserva[], keepalive = false) => {
      ultimoEnviadoRef.current = JSON.stringify(lista);
      fetch("/api/pos/reserva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessao, itens: lista }),
        keepalive,
      }).catch(() => {});
    },
    [sessao]
  );

  /* Mudou o carrinho: envia (com debounce). Esvaziou: envia a lista vazia uma vez pra liberar. */
  useEffect(() => {
    payloadRef.current = payload;
    const chave = JSON.stringify(payload);
    if (chave === ultimoEnviadoRef.current) return;
    const t = setTimeout(() => enviar(payload), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [payload, enviar]);

  /* Sinal periodico enquanto houver reserva, pra ela nao expirar no servidor. */
  useEffect(() => {
    const id = setInterval(() => {
      if (payloadRef.current.length > 0) enviar(payloadRef.current);
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [enviar]);

  /* Fechou o PDV / a aba: libera. */
  useEffect(() => {
    const liberar = () => {
      if (ultimoEnviadoRef.current !== "[]") enviar([], true);
    };
    window.addEventListener("pagehide", liberar);
    return () => {
      window.removeEventListener("pagehide", liberar);
      liberar();
    };
  }, [enviar]);
}
