import "server-only";
import * as cheerio from "cheerio";

/*
 * Porta de admin/api/v1/versiculo_dia.php (scraping de bibliaon.com) pro
 * Next.js — o PHP/MySQL legado saiu de uso, entao o widget nao pode mais
 * depender dele. Mesma cadeia de estrategias do original (heading ->
 * bloco de texto por rotulo -> ancora de referencia -> citacao entre aspas
 * -> meta description), da mais pra menos confiavel.
 */

const FONTE_URL = "https://www.bibliaon.com/versiculo_do_dia/";

const CORTES = [
  "Gostou?",
  "Versiculo de Ontem",
  "Versiculo de Anteontem",
  "Versiculo do Dia",
  "Versiculo do dia",
  "Versiculo de Hoje",
  "Versículo de Ontem",
  "Versículo de Anteontem",
  "Versículo do Dia",
  "Versículo do dia",
  "Versículo de Hoje",
];

const FRASES_INVALIDAS = [
  "diariamente um novo versiculo",
  "diariamente um novo versículo",
  "versiculo diario",
  "versiculo diário",
  "descubra nosso versiculo diario",
  "descubra nosso versículo diário",
  "diariamente um versiculo ou passagem biblica",
  "diariamente um versículo ou passagem bíblica",
  "diariamente um versiculo ou passagem bíblica",
  "diariamente um versículo ou passagem biblica",
  "passagem biblica para melhorar e inspirar",
  "passagem bíblica para melhorar e inspirar",
  "versiculo de ontem",
  "versículo de ontem",
  "versiculo de anteontem",
  "versículo de anteontem",
  "gostou?",
];

const REGEX_REFERENCIA = /([1-3]?\s?[A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)*\s+\d+:\d+(?:-\d+)?)/u;
const REGEX_CITACAO = /["“”'‘’]([^"“”'‘’]{20,320})["“”'‘’]\s*([1-3]?\s?[A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)*\s+\d+:\d+(?:-\d+)?)/u;

function limparTexto(textoBruto: string): string {
  let texto = textoBruto.replace(/\s+/g, " ").trim();
  texto = texto.replace(/^["'""''\s]+|["'""''\s]+$/g, "");
  for (const corte of CORTES) {
    const pos = texto.toLowerCase().indexOf(corte.toLowerCase());
    if (pos !== -1) texto = texto.slice(0, pos).trim();
  }
  texto = texto.replace(/^[\s\-–—:;"'""'']+|[\s\-–—:;"'""'']+$/g, "");
  if (texto.length > 320) {
    const trecho = texto.slice(0, 320);
    const ultimoPonto = trecho.lastIndexOf(".");
    texto = (ultimoPonto > 120 ? trecho.slice(0, ultimoPonto + 1) : trecho).trim();
  }
  return texto;
}

function versiculoInvalido(texto: string | null): boolean {
  if (!texto) return true;
  const minusculo = texto.toLowerCase();
  if (minusculo.length > 360) return true;
  return FRASES_INVALIDAS.some((frase) => minusculo.includes(frase));
}

function extrairReferencia(texto: string): { texto: string; referencia: string } {
  const m = texto.match(REGEX_REFERENCIA);
  if (!m) return { texto, referencia: "" };
  return { texto: limparTexto(texto.replace(m[1], "")), referencia: m[1].trim() };
}

function extrairVersiculo(html: string): { texto: string; referencia: string } | null {
  const $ = cheerio.load(html);

  // Estrategia 1: titulo "Versiculo de Hoje/do Dia" (nao "de ontem/anteontem"), texto no container pai.
  const headings = $("h1, h2, h3, h4, strong, b").toArray();
  for (const heading of headings) {
    const titulo = $(heading).text().trim();
    if (!titulo) continue;
    const tituloLower = titulo.toLowerCase();
    const ehTituloCerto = tituloLower.includes("versiculo de hoje") || tituloLower.includes("versiculo do dia") || tituloLower.includes("versículo de hoje") || tituloLower.includes("versículo do dia");
    if (!ehTituloCerto || tituloLower.includes("ontem") || tituloLower.includes("anteontem")) continue;

    let container = $(heading).parent();
    for (let i = 0; i < 3 && container.length; i++) {
      const ref = container.find("a[href*='/versiculo'], a[href*='/versiculos']").filter((_, el) => $(el).text().trim() !== "").first().text().trim();
      const candidato = container.find("p, blockquote").filter((_, el) => $(el).text().trim() !== "").first();
      if (candidato.length) {
        let textoVerso = limparTexto(candidato.text());
        if (textoVerso && !versiculoInvalido(textoVerso)) {
          // O <p> do verso costuma embutir o proprio link de referencia (ex.: "...Mateus 4:4"
          // dentro do texto) -- remove essa cauda duplicada em vez de deixar o texto repetir
          // a referencia que ja aparece separada, como badge, abaixo.
          let referencia = ref;
          if (referencia && textoVerso.endsWith(referencia)) {
            textoVerso = limparTexto(textoVerso.slice(0, textoVerso.length - referencia.length));
          } else if (!referencia) {
            ({ texto: textoVerso, referencia } = extrairReferencia(textoVerso));
          }
          if (textoVerso) return { texto: textoVerso, referencia };
        }
      }
      container = container.parent();
    }
  }

  $("script, style, noscript").remove();
  const textoCompleto = $.root().text().replace(/\s+/g, " ").trim();

  // Estrategia 2: bloco de texto apos o rotulo "Versiculo do dia"/"Versiculo de Hoje".
  const marcadores = ["Versiculo do dia", "Versiculo de Hoje", "Versículo do dia", "Versículo de Hoje"];
  for (const marcador of marcadores) {
    const idx = textoCompleto.toLowerCase().indexOf(marcador.toLowerCase());
    if (idx === -1) continue;
    const bloco = textoCompleto
      .slice(idx)
      .replace(/Vers[ií]culo (do dia|de hoje)/i, "")
      .replace(/\b\w+,\s*\d{1,2}\s*de\s*\w+\s*de\s*\d{4}\b/iu, "")
      .replace(/\s+/g, " ")
      .trim();
    if (bloco) {
      const { texto: textoVerso, referencia } = extrairReferencia(bloco);
      const limpo = limparTexto(textoVerso);
      if (limpo && !versiculoInvalido(limpo)) return { texto: limpo, referencia };
    }
  }

  // Estrategia 3: citacao entre aspas seguida de referencia.
  const matchCitacao = textoCompleto.match(REGEX_CITACAO);
  if (matchCitacao) {
    const texto = limparTexto(matchCitacao[1]);
    if (texto && !versiculoInvalido(texto)) return { texto, referencia: matchCitacao[2].trim() };
  }

  // Estrategia 4: meta description.
  const metaContent = ($("meta[property='og:description']").attr("content") ?? $("meta[name='description']").attr("content") ?? "").trim();
  if (metaContent) {
    const conteudo = metaContent
      .replace(/Vers[ií]culo do dia[:\s-]*/i, "")
      .replace(/\s+-\s+.*$/u, "")
      .trim();
    if (conteudo && !versiculoInvalido(conteudo)) {
      const { texto, referencia } = extrairReferencia(conteudo);
      return { texto: limparTexto(texto), referencia };
    }
  }

  return null;
}

export type VersiculoDoDia = { texto: string; referencia: string; fonteUrl: string };

export async function buscarVersiculoDoDia(): Promise<VersiculoDoDia | null> {
  try {
    const res = await fetch(FONTE_URL, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LillyMenuDashboard/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const extraido = extrairVersiculo(html);
    if (!extraido || !extraido.texto || versiculoInvalido(extraido.texto)) return null;
    return { texto: extraido.texto, referencia: extraido.referencia, fonteUrl: FONTE_URL };
  } catch {
    return null;
  }
}
