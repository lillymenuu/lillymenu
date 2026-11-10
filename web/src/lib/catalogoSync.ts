/*
 * Aviso entre abas do mesmo navegador: quando o cadastro de produto/estoque e salvo numa aba, as
 * outras (ex.: Balcao aberto) recarregam o catalogo sem precisar de F5.
 */
const CANAL = "lillymenu-catalogo";

export function avisarCatalogoAlterado() {
  try {
    const c = new BroadcastChannel(CANAL);
    c.postMessage({ tipo: "alterado", em: Date.now() });
    c.close();
  } catch {
    /* navegador sem BroadcastChannel: o Balcao ainda recarrega ao voltar o foco pra aba */
  }
}

/** Chama `cb` quando outra aba alterar o catalogo. Retorna a funcao de cancelar. */
export function ouvirCatalogoAlterado(cb: () => void): () => void {
  try {
    const c = new BroadcastChannel(CANAL);
    c.onmessage = () => cb();
    return () => c.close();
  } catch {
    return () => {};
  }
}
