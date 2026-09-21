export type StoreEventoTipo = "visita" | "view_item" | "carrinho" | "pedido";

/* Id anonimo do visitante: permite ao dashboard contar pessoas (nao cliques) por etapa do funil. */
function visitanteId(): string {
  try {
    let v = localStorage.getItem("lm_visitante");
    if (!v) {
      v = crypto.randomUUID().replace(/[^A-Za-z0-9_-]/g, "");
      localStorage.setItem("lm_visitante", v);
    }
    return v;
  } catch {
    return "";
  }
}

export function trackStoreEvento(lojaId: number, tipo: StoreEventoTipo) {
  try {
    const visitante = visitanteId();
    if (!visitante) return;
    void fetch("/api/store/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loja_id: lojaId, tipo, visitante }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignora */
  }
}
