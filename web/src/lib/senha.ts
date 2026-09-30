const REGEX_MAIUSCULA = /[A-ZÀ-Ý]/;
const REGEX_MINUSCULA = /[a-zà-ÿ]/;
const REGEX_ESPECIAL = /[^A-Za-zÀ-ÿ0-9]/;

export const DICA_SENHA_FORTE = "Mínimo de 8 caracteres, com letra maiúscula, minúscula e caractere especial.";

/** Null quando a senha atende os requisitos; caso contrário, a mensagem do primeiro requisito que falhou. */
export function validarSenhaForte(senha: string): string | null {
  if (senha.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!REGEX_MAIUSCULA.test(senha)) return "A senha deve ter pelo menos uma letra maiúscula.";
  if (!REGEX_MINUSCULA.test(senha)) return "A senha deve ter pelo menos uma letra minúscula.";
  if (!REGEX_ESPECIAL.test(senha)) return "A senha deve ter pelo menos um caractere especial.";
  return null;
}
