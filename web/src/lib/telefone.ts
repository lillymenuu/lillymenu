/* Mascara de telefone BR: (00) 0000-0000 ou (00) 00000-0000. Numeros salvos
   com o DDI 55 na frente (ex.: 5585999999999) perdem o 55 antes de mascarar. */
export function maskTelefone(valor: string): string {
  let v = valor.replace(/\D/g, "");
  if (v.length > 11 && v.startsWith("55")) v = v.slice(2);
  v = v.slice(0, 11);
  if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  if (v.length > 5) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  if (v.length > 2) return v.replace(/(\d{2})(\d{0,4})/, "($1) $2");
  if (v.length > 0) return v.replace(/(\d{0,2})/, "($1");
  return v;
}
