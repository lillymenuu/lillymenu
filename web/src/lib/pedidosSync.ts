/*
 * Aviso entre abas/telas do mesmo navegador de que um pedido foi criado ou alterado (PDV balcao).
 * O Gestor de pedidos ouve e recarrega na hora, em vez de esperar o proximo ciclo do polling.
 */
const CANAL = "lillymenu-pedidos";

export function avisarPedidoAlterado() {
  try {
    const c = new BroadcastChannel(CANAL);
    c.postMessage({ tipo: "alterado", em: Date.now() });
    c.close();
  } catch {
    /* navegador sem BroadcastChannel: o Gestor atualiza no proximo ciclo do polling */
  }
}

/** Chama `cb` quando um pedido for criado/alterado em outra tela. Retorna a funcao de cancelar. */
export function ouvirPedidoAlterado(cb: () => void): () => void {
  try {
    const c = new BroadcastChannel(CANAL);
    c.onmessage = () => cb();
    return () => c.close();
  } catch {
    return () => {};
  }
}
