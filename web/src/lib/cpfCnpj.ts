export function formatarCpfCnpj(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 14);
  if (nums.length <= 11) {
    return nums
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return nums
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function validarCPF(nums: string): boolean {
  if (nums.length !== 11 || /^(\d)\1{10}$/.test(nums)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums[9], 10)) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(nums[10], 10);
}

function validarCNPJ(nums: string): boolean {
  if (nums.length !== 14 || /^(\d)\1{13}$/.test(nums)) return false;
  const calc = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += parseInt(base[i], 10) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const base = nums.slice(0, 12);
  const dv1 = calc(base);
  const dv2 = calc(base + dv1);
  return nums === base + String(dv1) + String(dv2);
}

/** Aceita CPF (11 digitos) ou CNPJ (14 digitos), validando os digitos verificadores. */
export function validarCpfCnpj(valor: string): boolean {
  const nums = valor.replace(/\D/g, "");
  if (nums.length === 11) return validarCPF(nums);
  if (nums.length === 14) return validarCNPJ(nums);
  return false;
}
