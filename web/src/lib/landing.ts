/** Corrige links antigos (dominio/paginas PHP legadas) para os equivalentes na landing nova, em Next. */
export function remapLegacyHref(href: string): string {
  const limpo = href.trim();
  if (limpo.includes("/admin/login")) return "/login";
  if (limpo.includes("/public/planos")) return "#planos";
  if (limpo.includes("/public/home") || limpo === "https://lillymenu.com/") return "#top";
  return limpo;
}

export function buildWhatsappLink(numero: string, mensagem: string): string {
  const digitos = numero.replace(/\D/g, "");
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

/** Substitui o placeholder "{brand}" usado no conteudo migrado do site antigo. */
export function aplicarBrand(texto: string, brand: string): string {
  return texto.replaceAll("{brand}", brand);
}
