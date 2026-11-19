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
  const v = valor.replace(/\D/g, "").slice(0, 11);
  /* Separador so entra quando ja ha digito depois dele: se a mascara deixasse "(85) 9865-" com o
     hifen sobrando, apagar o hifen nao mudava os digitos e ele voltava na hora (campo travava). */
  if (v.length === 0) return "";
  if (v.length <= 2) return `(${v}`;
  const ddd = v.slice(0, 2);
  const resto = v.slice(2);
  const corte = v.length > 10 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}
