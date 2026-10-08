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

/** "Azul Kukie" — cor de acento historica da landing (ver DESIGN.md), usada como fallback quando
 * o campo de tema do CMS ainda nao foi preenchido. */
export const COR_ACENTO_LANDING_PADRAO = "#2563eb";

/**
 * Deriva, a partir da cor de acento escolhida no CMS (um unico hex), tudo que os componentes da
 * landing precisam pra pintar botoes/links/sombras sem cor fixa espalhada em ~17 arquivos:
 * - hex: a propria cor, normalizada
 * - escuroHex: tom ~18% mais escuro (equivalente ao #1d4ed8 que o Azul Kukie usava pro hover)
 * - rgb: componentes "R G B" (sintaxe moderna de cor CSS) pra montar rgb(var(--x)/alpha) em sombras
 *   com qualquer opacidade, sem precisar de uma variavel por sombra.
 */
export function corAcentoLanding(hexInput: string | undefined) {
  const hex = normalizarHex(hexInput) ?? COR_ACENTO_LANDING_PADRAO;
  const rgb = hexParaRgb(hex) ?? hexParaRgb(COR_ACENTO_LANDING_PADRAO)!;
  const escuro = rgb.map((c) => Math.max(0, Math.round(c * 0.82))) as [number, number, number];
  const claro = rgb.map((c) => Math.round(c + (255 - c) * 0.92)) as [number, number, number]; // ~ #eef2ff a partir do Azul Kukie
  return {
    hex,
    escuroHex: rgbParaHex(escuro),
    claroHex: rgbParaHex(claro),
    rgb: rgb.join(" "),
  };
}

function normalizarHex(hex: string | undefined): string | null {
  const limpo = (hex ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(limpo) ? limpo.toLowerCase() : null;
}

function hexParaRgb(hex: string): [number, number, number] | null {
  const limpo = normalizarHex(hex);
  if (!limpo) return null;
  return [parseInt(limpo.slice(1, 3), 16), parseInt(limpo.slice(3, 5), 16), parseInt(limpo.slice(5, 7), 16)];
}

function rgbParaHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
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
