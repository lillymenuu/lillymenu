/** Compartilhado entre o dialog de saida (client) e a validacao no servidor — sem "server-only" de proposito. */
export const MOTIVOS_SAIDA = [
  { valor: "sangria_deposito", label: "Sangria para depósito" },
  { valor: "pagamento_fornecedor", label: "Pagamento de fornecedor" },
  { valor: "compra_material", label: "Compra de material de consumo" },
  { valor: "troco", label: "Troco" },
  { valor: "outro", label: "Outro" },
] as const;

export type MotivoSaida = (typeof MOTIVOS_SAIDA)[number]["valor"];

export const MOTIVOS_SAIDA_VALORES = MOTIVOS_SAIDA.map((m) => m.valor) as string[];

export function labelMotivoSaida(motivo: string | null | undefined): string {
  return MOTIVOS_SAIDA.find((m) => m.valor === motivo)?.label ?? "Outro";
}

/** Acima desse valor, a saida exige confirmar a senha do supervisor selecionado. */
export const LIMITE_AUTORIZACAO_SENHA = 200;
