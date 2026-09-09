export const COLUNAS = [
  { status: "pendente", label: "Pendente" },
  { status: "aceito", label: "Aceito" },
  { status: "preparando", label: "Preparando" },
  { status: "entrega", label: "Entrega" },
] as const;

export type StatusColuna = (typeof COLUNAS)[number]["status"];

export const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aceito: "Aceito",
  preparando: "Preparando",
  entrega: "Entrega",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const TIPO_LABELS: Record<string, string> = {
  entrega: "ENTREGA",
  retirada: "RETIRADA",
  mesa: "MESA",
};

/** Próxima etapa a partir de cada status do quadro; "entrega" avança via
 * pedidos_finalizar.php (não pedidos_status.php), tratado à parte. */
export const PROXIMA_ETAPA: Record<string, { label: string; proximo: string }> = {
  pendente: { label: "Aceitar", proximo: "aceito" },
  aceito: { label: "Iniciar preparo", proximo: "preparando" },
  preparando: { label: "Sair para entrega", proximo: "entrega" },
  entrega: { label: "Mover para finalizado", proximo: "finalizado" },
};

export function formatBRL(v: number | string) {
  return `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
}

export function formatTempoRelativo(iso: string): string {
  if (!iso) return "-";
  const data = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(data.getTime())) return "-";
  const diffMin = Math.max(0, Math.floor((Date.now() - data.getTime()) / 60000));
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const horas = Math.floor(diffMin / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias > 1 ? "s" : ""}`;
}
