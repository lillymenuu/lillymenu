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

/**
 * Rola manualmente ate a secao em vez de deixar o navegador navegar por "#id" -- evita que o hash
 * fique visivel na URL. Tambem cobre "#top": como o header e sticky top-0, seu bounding rect ja
 * fica em y=0 e o navegador ignoraria a ancora sem rolar nada. So roda no client (usa window/document).
 */
export function rolarParaAncora(href: string): void {
  const id = href.slice(1);
  if (id === "" || id === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
