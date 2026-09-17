export function formatarPreco(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Mascara de valor monetario digitado (ex.: "10000" -> "100,00"), mesma logica de MoneyInput. */
export function maskValorDigitado(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return "";
  const num = parseInt(digitos, 10) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte um valor mascarado ("1.234,56") de volta pra numero. */
export function parseValorMascarado(valor: string): number {
  if (!valor.trim()) return NaN;
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

export function formatarTelefone(valor: string): string {
  let v = valor.replace(/\D/g, "").slice(0, 11);
  if (v.length > 10) {
    v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  } else if (v.length > 5) {
    v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  } else if (v.length > 2) {
    v = v.replace(/(\d{2})(\d{0,4})/, "($1) $2");
  } else if (v.length > 0) {
    v = v.replace(/(\d{0,2})/, "($1");
  }
  return v;
}
