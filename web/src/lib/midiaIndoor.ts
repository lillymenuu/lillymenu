/*
 * Midia Indoor - Menu Digital: tipos e regras compartilhados entre servidor, Admin (/midia-indoor)
 * e o player da TV (/tv).
 */

export type LayoutTv = "vitrine" | "grade" | "misto";

export type ConfigTv = {
  /** Segundos que cada produto fica na tela. */
  tempoSlide: number;
  /** "categorias": exibe as categorias marcadas; "produtos": so os produtos escolhidos um a um. */
  modo: "categorias" | "produtos";
  /** Categorias exibidas no modo "categorias"; vazio = todas. */
  categorias: number[];
  /** Itens escolhidos no modo "produtos" ("p<id>" produto, "c<id>" combo). */
  produtos: string[];
  somenteComFoto: boolean;
  esconderEsgotados: boolean;
  /** QR Code da loja no canto, pro cliente pedir pelo celular. */
  mostrarQrLoja: boolean;
  orientacao: "horizontal" | "vertical";
};

export const CONFIG_TV_PADRAO: ConfigTv = {
  tempoSlide: 8,
  modo: "categorias",
  categorias: [],
  produtos: [],
  somenteComFoto: false,
  esconderEsgotados: true,
  mostrarQrLoja: true,
  orientacao: "horizontal",
};

export const TEMPO_SLIDE_MIN = 5;
export const TEMPO_SLIDE_MAX = 30;

/** Le a config gravada (jsonb) aplicando os padroes e os limites, pra nunca quebrar o player. */
export function normalizarConfigTv(bruto: unknown): ConfigTv {
  const c = (bruto && typeof bruto === "object" ? bruto : {}) as Partial<Record<keyof ConfigTv, unknown>>;
  const tempo = Number(c.tempoSlide);
  return {
    tempoSlide: Number.isFinite(tempo) ? Math.min(TEMPO_SLIDE_MAX, Math.max(TEMPO_SLIDE_MIN, Math.round(tempo))) : CONFIG_TV_PADRAO.tempoSlide,
    modo: c.modo === "produtos" ? "produtos" : "categorias",
    categorias: Array.isArray(c.categorias) ? c.categorias.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [],
    produtos: Array.isArray(c.produtos) ? c.produtos.map(String).filter((s) => /^[pc]\d+$/.test(s)).slice(0, 2000) : [],
    somenteComFoto: typeof c.somenteComFoto === "boolean" ? c.somenteComFoto : CONFIG_TV_PADRAO.somenteComFoto,
    esconderEsgotados: typeof c.esconderEsgotados === "boolean" ? c.esconderEsgotados : CONFIG_TV_PADRAO.esconderEsgotados,
    mostrarQrLoja: typeof c.mostrarQrLoja === "boolean" ? c.mostrarQrLoja : CONFIG_TV_PADRAO.mostrarQrLoja,
    orientacao: c.orientacao === "vertical" ? "vertical" : "horizontal",
  };
}

export function ehLayoutTv(v: unknown): v is LayoutTv {
  return v === "vitrine" || v === "grade" || v === "misto";
}

/** Codigo de pareamento sem caracteres ambiguos (0/O, 1/I/L), exibido como "K7P-4QX". */
export const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const TAMANHO_CODIGO = 6;

export function formatarCodigoPareamento(codigo: string): string {
  return codigo.length === TAMANHO_CODIGO ? `${codigo.slice(0, 3)}-${codigo.slice(3)}` : codigo;
}

/** Aceita o codigo digitado com hifen, espaco ou minusculas. */
export function limparCodigoPareamento(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, TAMANHO_CODIGO);
}

/** Header com o token da TV nas chamadas do player. */
export const HEADER_TOKEN_TV = "x-tv-token";

export type TvAdmin = {
  id: number;
  nome: string;
  layout: LayoutTv;
  config: ConfigTv;
  ultimoAcesso: string | null;
  criadoEm: string;
};

/** Considera a TV online se consultou o catalogo nos ultimos 3 minutos (o player consulta a cada 60 s). */
export const TV_ONLINE_SEGUNDOS = 180;

export type ProdutoTv = {
  id: string;
  nome: string;
  descricao: string | null;
  imagem: string | null;
  categoria: string;
  categoriaId: number;
  precoBase: number;
  precoFinal: number;
  emPromo: boolean;
  descPct: number;
  esgotado: boolean;
  destaque: boolean;
};

export type CatalogoTv = {
  tv: { nome: string; layout: LayoutTv; config: ConfigTv };
  loja: { nome: string; logo: string | null; cor: string; aberta: boolean; verificada: boolean; link: string };
  produtos: ProdutoTv[];
};

/** Item da lista "Escolher produtos" na configuracao da TV. */
export type ItemEscolhaTv = { id: string; nome: string; imagem: string | null; preco: number; combo: boolean };
export type CategoriaEscolhaTv = { id: number; nome: string; itens: ItemEscolhaTv[] };
