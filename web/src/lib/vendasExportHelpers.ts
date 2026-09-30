import "server-only";
import type { RelatorioVendasResultado } from "@/db/queries/relatoriosVendas";

const PERIODO_LABELS: Record<string, string> = {
  hoje: "Hoje",
  "7dias": "Últimos 7 dias",
  "30dias": "Últimos 30 dias",
  customizado: "Personalizado",
};

const TIPO_LABELS_FILTRO: Record<string, string> = {
  "": "Todos",
  entrega: "Entrega",
  retirada: "Retirada",
};

function dataCurta(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function periodoLabelExport(periodo: string, relatorio: RelatorioVendasResultado): string {
  const base = PERIODO_LABELS[periodo] ?? periodo;
  const intervalo = `${dataCurta(relatorio.periodoInicio)} a ${dataCurta(relatorio.periodoFim)}`;
  return periodo === "customizado" ? intervalo : `${base} (${intervalo})`;
}

export function tipoLabelExport(tipo: string): string {
  return TIPO_LABELS_FILTRO[tipo] ?? tipo;
}
