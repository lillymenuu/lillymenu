export type CupomTipo = "valor" | "percent" | "frete";

export type Cupom = {
  id: number;
  codigo: string;
  tipo: CupomTipo;
  desconto: number;
  minimo: number;
  quantidade_total: number;
  quantidade_usada: number;
  ativo: boolean;
  primeira_compra: boolean;
  publico: boolean;
  criado_em: string;
};

export type CuponsListarResposta = {
  ok: true;
  cupons: Cupom[];
};

export const CUPOM_TIPO_LABEL: Record<CupomTipo, string> = {
  valor: "Valor fixo",
  percent: "Percentagem %",
  frete: "Frete grátis",
};

export function cupomDescricao(c: Cupom): string {
  if (c.tipo === "frete") {
    return `Frete grátis para compras acima de R$ ${c.minimo.toFixed(2).replace(".", ",")}`;
  }
  if (c.tipo === "percent") {
    return `${c.desconto.toFixed(2).replace(".", ",")}% de desconto para compras acima de R$ ${c.minimo.toFixed(2).replace(".", ",")}`;
  }
  return `R$ ${c.desconto.toFixed(2).replace(".", ",")} de desconto para compras acima de R$ ${c.minimo.toFixed(2).replace(".", ",")}`;
}
