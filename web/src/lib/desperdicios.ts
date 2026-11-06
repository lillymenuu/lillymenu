/*
 * Controle de desperdicio (/desperdicios): tipos e rotulos compartilhados entre servidor,
 * tela e relatorios (PDF/Excel).
 */

export type TipoDesperdicio = "produto_vencido" | "insumo" | "embalagem" | "outros";
export type MotivoDesperdicio = "vencido" | "estragou" | "quebra" | "erro_producao" | "outros";
export type OrigemDesperdicio = "produto" | "avulsa";

/* Cores em escala de cobre (um acento so — regra dos dois tons do DESIGN.md). */
export const TIPOS: { id: TipoDesperdicio; label: string; cor: string }[] = [
  { id: "produto_vencido", label: "Produto vencido", cor: "#7A3F10" },
  { id: "insumo", label: "Insumo estragado", cor: "#9C5523" },
  { id: "embalagem", label: "Embalagem", cor: "#C98A55" },
  { id: "outros", label: "Outros", cor: "#E6C7A6" },
];

export const MOTIVOS: { id: MotivoDesperdicio; label: string; cor: string }[] = [
  { id: "vencido", label: "Vencido", cor: "#7A3F10" },
  { id: "estragou", label: "Estragou", cor: "#9C5523" },
  { id: "quebra", label: "Quebra/avaria", cor: "#B8743E" },
  { id: "erro_producao", label: "Erro de produção", cor: "#D4A276" },
  { id: "outros", label: "Outros", cor: "#E9D3BC" },
];

export const TIPO_LABEL: Record<TipoDesperdicio, string> = Object.fromEntries(TIPOS.map((t) => [t.id, t.label])) as Record<TipoDesperdicio, string>;
export const MOTIVO_LABEL: Record<MotivoDesperdicio, string> = Object.fromEntries(MOTIVOS.map((m) => [m.id, m.label])) as Record<MotivoDesperdicio, string>;
export const ORIGEM_LABEL: Record<OrigemDesperdicio, string> = { produto: "Produto cadastrado", avulsa: "Despesa avulsa" };

export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MESES_NOMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function ehTipo(v: unknown): v is TipoDesperdicio {
  return TIPOS.some((t) => t.id === v);
}
export function ehMotivo(v: unknown): v is MotivoDesperdicio {
  return MOTIVOS.some((m) => m.id === v);
}

export type Desperdicio = {
  id: number;
  data: string; // YYYY-MM-DD
  tipo: TipoDesperdicio;
  motivo: MotivoDesperdicio;
  origem: OrigemDesperdicio;
  produtoId: number | null;
  descricao: string;
  quantidade: number;
  custoUnitario: number;
  total: number;
  observacao: string | null;
};

export type FatiaValor = { id: string; label: string; total: number; quantidade: number };

export type DesperdicioDashboard = {
  ok: true;
  mes: number;
  ano: number;
  anos: number[];
  resumo: {
    total: number;
    totalMesAnterior: number;
    quantidade: number;
    lancamentos: number;
  };
  porTipo: FatiaValor[];
  porMotivo: FatiaValor[];
  topItens: { descricao: string; total: number; quantidade: number }[];
  evolucao: { mes: number; ano: number; total: number }[];
  lancamentos: Desperdicio[];
};

/** Filtros dos relatorios (PDF/Excel). Periodo em "YYYY-MM". */
export type FiltrosDesperdicio = {
  de: string;
  ate: string;
  tipo?: TipoDesperdicio;
  motivo?: MotivoDesperdicio;
  origem?: OrigemDesperdicio;
  busca?: string;
};

export type ProdutoParaPerda = { id: number; nome: string; categoria: string | null; precoCusto: number | null };

export function periodoLabel(de: string, ate: string): string {
  const fmt = (ym: string) => {
    const [a, m] = ym.split("-").map(Number);
    return `${MESES_NOMES[(m || 1) - 1]} de ${a}`;
  };
  return de === ate ? fmt(de) : `${fmt(de)} a ${fmt(ate)}`;
}

/** Texto dos filtros aplicados, pro cabecalho dos relatorios. */
export function filtrosLabel(f: FiltrosDesperdicio): string[] {
  const partes = [`Período: ${periodoLabel(f.de, f.ate)}`];
  if (f.tipo) partes.push(`Tipo: ${TIPO_LABEL[f.tipo]}`);
  if (f.motivo) partes.push(`Motivo: ${MOTIVO_LABEL[f.motivo]}`);
  if (f.origem) partes.push(`Origem: ${ORIGEM_LABEL[f.origem]}`);
  if (f.busca?.trim()) partes.push(`Busca: "${f.busca.trim()}"`);
  return partes;
}

/** Le os filtros da URL dos relatorios; periodo invalido cai no mes atual (America/Fortaleza). */
export function filtrosDaUrl(params: URLSearchParams): FiltrosDesperdicio {
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/;
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit" }).format(new Date());
  let de = params.get("de") ?? "";
  let ate = params.get("ate") ?? "";
  if (!ym.test(de)) de = hoje;
  if (!ym.test(ate)) ate = de;
  if (ate < de) [de, ate] = [ate, de];
  const tipo = params.get("tipo");
  const motivo = params.get("motivo");
  const origem = params.get("origem");
  return {
    de,
    ate,
    tipo: ehTipo(tipo) ? tipo : undefined,
    motivo: ehMotivo(motivo) ? motivo : undefined,
    origem: origem === "produto" || origem === "avulsa" ? origem : undefined,
    busca: (params.get("busca") ?? "").trim().slice(0, 80) || undefined,
  };
}
