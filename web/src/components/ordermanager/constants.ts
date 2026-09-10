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

export const STATUS_CORES: Record<string, { bg: string; fg: string }> = {
  pendente: { bg: "#f1f5f9", fg: "#64748b" },
  aceito: { bg: "#e0f2fe", fg: "#0369a1" },
  preparando: { bg: "#fef3c7", fg: "#92400e" },
  entrega: { bg: "#fee2e2", fg: "#be123c" },
  finalizado: { bg: "#dcfce7", fg: "#166534" },
  cancelado: { bg: "#fee2e2", fg: "#991b1b" },
};

export const TIPO_LABELS: Record<string, string> = {
  entrega: "ENTREGA",
  retirada: "RETIRADA",
  mesa: "MESA",
};

export const TIPO_CORES: Record<string, string> = {
  entrega: "#ea580c",
  retirada: "#2563eb",
  mesa: "#7c3aed",
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

export function formatHora(iso: string): string {
  if (!iso) return "-";
  const data = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDataHora(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
