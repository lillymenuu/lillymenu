"use client";

/*
 * Impressao termica via QZ Tray (ESC/POS cru) — port de admin/assets/js/impressao_qz.js
 * pra dentro do Next, com a biblioteca qz-tray do npm. Antes o Next carregava o script
 * do painel PHP via <Script>, mas: (1) a biblioteca qz-tray.js nunca era carregada, entao
 * "qz" nao existia e a conexao sempre falhava; (2) a URL saia como /admin/admin/...;
 * (3) os dados do pedido vinham de "api/pdv_detalhe.php" relativo, que nao existe no Next.
 *
 * As impressoras (perfis) ficam salvas na loja (/api/impressao/perfis), iguais pra todos os
 * computadores. Cada computador guarda so o VINCULO perfil -> impressora do Windows
 * (localStorage), e so imprime pelos perfis que vinculou. Uma copia da lista da loja fica
 * em cache local pra leitura sincrona e pra funcionar se a rede oscilar.
 * Tambem expoe window.impressaoQZ pra manter compativeis os chamadores existentes.
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { PerfilImpressao } from "@/lib/impressao";

type QZ = {
  version: string;
  websocket: {
    isActive: () => boolean;
    connect: (opts?: Record<string, unknown>) => Promise<void>;
    getConnectionInfo: () => { host?: string; port?: number } | undefined;
  };
  printers: { find: (q?: string) => Promise<string | string[]>; getDefault: () => Promise<string> };
  configs: { create: (printer: string, opts?: Record<string, unknown>) => unknown };
  print: (config: unknown, data: unknown[]) => Promise<void>;
  security: {
    setCertificatePromise: (fn: (resolve: (v?: string) => void, reject: (e?: unknown) => void) => void) => void;
    setSignatureAlgorithm: (alg: string) => void;
    setSignaturePromise: (fn: (toSign: string) => (resolve: (v?: string) => void, reject: (e?: unknown) => void) => void) => void;
  };
  api: { getVersion: () => Promise<string> };
};

const CACHE_KEY = "lm_impressoras_loja"; // copia da lista da loja
const VINCULO_KEY = "lm_impressoras_vinculo"; // { [perfilId]: nome da impressora no Windows }
const LEGADO_KEY = "lm_impressoras"; // formato antigo: perfis completos so neste navegador
const EVENTO_PERFIS = "lm-impressoras-alteradas";
const ESC = "\x1B";
const GS = "\x1D";

let qzPromise: Promise<QZ> | null = null;
let conectando: Promise<void> | null = null;

function carregarQZ(): Promise<QZ> {
  if (!qzPromise) {
    qzPromise = import("qz-tray").then((m) => {
      const qz = ((m as { default?: QZ }).default ?? m) as QZ;
      configurarSeguranca(qz);
      return qz;
    });
  }
  return qzPromise;
}

/* Certificado/assinatura vem do servidor (QZ_CERTIFICATE / QZ_PRIVATE_KEY). Sem eles,
   as rotas devolvem vazio e o QZ Tray opera em modo anonimo (pede "Allow" na tela). */
function configurarSeguranca(qz: QZ) {
  qz.security.setCertificatePromise((resolve) => {
    fetch("/api/impressao/certificado", { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => resolve(t || undefined))
      .catch(() => resolve());
  });
  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise((mensagem) => (resolve) => {
    fetch("/api/impressao/assinar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensagem }) })
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => resolve(t || undefined))
      .catch(() => resolve());
  });
}

/* ---------- perfis ---------- */

type PerfilLoja = Omit<PerfilImpressao, "qzPrinterName" | "tipo" | "id"> & { id: string };

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function lerJSON<T>(chave: string, padrao: T): T {
  try {
    const v = JSON.parse(ler(chave) ?? "null");
    return v ?? padrao;
  } catch {
    return padrao;
  }
}

function gravarJSON(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* modo privado / storage bloqueado */
  }
  window.dispatchEvent(new Event(EVENTO_PERFIS));
}

function lerVinculos(): Record<string, string> {
  const v = lerJSON<Record<string, string>>(VINCULO_KEY, {});
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function combinar(perfisLoja: PerfilLoja[], vinculos: Record<string, string>): PerfilImpressao[] {
  return perfisLoja.map((p) => ({ ...p, tipo: "nao_fiscal", qzPrinterName: vinculos[p.id] ?? "" }));
}

/* Lista da loja (do cache local) + impressora do Windows vinculada neste computador ("" = nao vinculada). */
export function listarPerfis(): PerfilImpressao[] {
  const cache = lerJSON<PerfilLoja[]>(CACHE_KEY, []);
  return combinar(Array.isArray(cache) ? cache : [], lerVinculos());
}

function assinarPerfis(cb: () => void) {
  const onStorage = (e: StorageEvent) => (e.key === CACHE_KEY || e.key === VINCULO_KEY) && cb();
  window.addEventListener(EVENTO_PERFIS, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENTO_PERFIS, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/* Separador que nao aparece em JSON valido (nomes de impressora podem ter "|"). */
const SEP = "\u0001";

function snapshotPerfis() {
  return (ler(CACHE_KEY) ?? "[]") + SEP + (ler(VINCULO_KEY) ?? "{}");
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { cache: "no-store", ...init });
  const dados = await r.json().catch(() => ({ ok: false }));
  if (!dados.ok) throw new Error(dados.msg || "Não foi possível falar com o servidor.");
  return dados as T;
}

function postarPerfil(perfil: PerfilLoja) {
  return api<{ ok: true; perfis: PerfilLoja[] }>("/api/impressao/perfis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ perfil }),
  });
}

function paraLoja(p: PerfilImpressao & { id: string }): PerfilLoja {
  const { qzPrinterName: _q, tipo: _t, ...resto } = p;
  void _q;
  void _t;
  return resto;
}

/* Perfis do formato antigo (so no localStorage) sobem pra loja uma vez, mantendo o vinculo local. */
async function migrarLegado(perfisLoja: PerfilLoja[]): Promise<PerfilLoja[]> {
  const legado = lerJSON<PerfilImpressao[]>(LEGADO_KEY, []);
  if (!Array.isArray(legado) || !legado.length) return perfisLoja;
  let lista = perfisLoja;
  const vinculos = lerVinculos();
  for (const p of legado) {
    if (!p?.id || !p.nome) continue;
    if (!lista.some((x) => x.id === p.id)) lista = (await postarPerfil(paraLoja(p as PerfilImpressao & { id: string }))).perfis;
    if (p.qzPrinterName && !vinculos[p.id]) vinculos[p.id] = p.qzPrinterName;
  }
  gravarJSON(VINCULO_KEY, vinculos);
  try {
    localStorage.removeItem(LEGADO_KEY);
  } catch {
    /* ignore */
  }
  return lista;
}

let sincronizando: Promise<PerfilImpressao[]> | null = null;

/* Busca a lista da loja no servidor e atualiza o cache local. */
export function sincronizarPerfis(): Promise<PerfilImpressao[]> {
  if (!sincronizando) {
    sincronizando = (async () => {
      const { perfis } = await api<{ ok: true; perfis: PerfilLoja[] }>("/api/impressao/perfis");
      const lista = await migrarLegado(perfis);
      gravarJSON(CACHE_KEY, lista);
      return listarPerfis();
    })().finally(() => {
      sincronizando = null;
    });
  }
  return sincronizando;
}

/* Impressoras da loja com o vinculo deste computador — reativo e sincroniza com o servidor ao montar. */
export function usePerfisImpressao(): PerfilImpressao[] {
  const raw = useSyncExternalStore(assinarPerfis, snapshotPerfis, () => "[]" + SEP + "{}");
  useEffect(() => {
    sincronizarPerfis().catch(() => {
      /* sem rede: segue com o cache */
    });
  }, []);
  return useMemo(() => {
    const [cache, vinc] = raw.split(SEP);
    try {
      const lista = JSON.parse(cache);
      const vinculos = JSON.parse(vinc);
      return combinar(Array.isArray(lista) ? lista : [], vinculos && typeof vinculos === "object" ? vinculos : {});
    } catch {
      return [];
    }
  }, [raw]);
}

/* Salva o perfil na loja e o vinculo com a impressora do Windows neste computador. */
export async function salvarPerfil(perfil: PerfilImpressao): Promise<PerfilImpressao> {
  const id = perfil.id || `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const salvo = { ...perfil, id };
  const { perfis } = await postarPerfil(paraLoja(salvo));
  gravarJSON(CACHE_KEY, perfis);
  vincularImpressora(id, perfil.qzPrinterName);
  return salvo;
}

export async function excluirPerfil(id: string) {
  const { perfis } = await api<{ ok: true; perfis: PerfilLoja[] }>(`/api/impressao/perfis?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  gravarJSON(CACHE_KEY, perfis);
  vincularImpressora(id, "");
}

/* Vinculo local: so neste computador. "" remove. */
export function vincularImpressora(perfilId: string, impressora: string) {
  const vinculos = lerVinculos();
  if (impressora) vinculos[perfilId] = impressora;
  else delete vinculos[perfilId];
  gravarJSON(VINCULO_KEY, vinculos);
}

async function perfisAtuais() {
  return sincronizarPerfis().catch(() => listarPerfis());
}

/* So imprime por perfis vinculados a uma impressora deste computador. */
async function perfisPara(uso: string) {
  return (await perfisAtuais()).filter((p) => p.qzPrinterName && p.impressaoAutomatica && (p.usoPara === uso || p.usoPara === "ambos"));
}

/* ---------- conexao ---------- */

export async function garantirConexao(): Promise<void> {
  const qz = await carregarQZ();
  if (qz.websocket.isActive()) return;
  if (!conectando) {
    conectando = qz.websocket.connect({ retries: 1, delay: 1 }).finally(() => {
      conectando = null;
    });
  }
  await conectando;
}

export async function statusConexao(): Promise<{ conectado: boolean; versao: string | null; erro: string | null }> {
  try {
    await garantirConexao();
    const qz = await carregarQZ();
    const versao = await qz.api.getVersion().catch(() => null);
    return { conectado: true, versao, erro: null };
  } catch (e) {
    return { conectado: false, versao: null, erro: e instanceof Error ? e.message : String(e) };
  }
}

export async function listarImpressorasSistema(): Promise<string[]> {
  await garantirConexao();
  const qz = await carregarQZ();
  const encontradas = await qz.printers.find("");
  return Array.isArray(encontradas) ? encontradas : [encontradas];
}

export async function impressoraPadrao(): Promise<string | null> {
  try {
    await garantirConexao();
    const qz = await carregarQZ();
    return (await qz.printers.getDefault()) || null;
  } catch {
    return null;
  }
}

/* ---------- montagem do cupom ---------- */

type Linha = { texto: string; bold: boolean; big: boolean; align: "left" | "center"; quebra: boolean };
type Dados = {
  pedido: Record<string, unknown> & { id?: number; codigo?: string | number; tipo?: string; criado_em?: string | null };
  itens?: {
    quantidade: number;
    produto_nome: string;
    preco: number;
    observacoes?: string | null;
    pontos?: number;
    opcoes?: { titulo: string; nome: string; quantidade?: number }[];
  }[];
  pagamentos?: { forma: string; valor: number }[];
  loja_nome?: string;
  loja_cnpj?: string;
  id_curto?: string;
  cashback_usado?: number;
  cashback_ganho?: number;
  pontos_a_receber?: number;
  pedidos_na_loja?: number;
};

function largura(papel: string) {
  return papel === "80mm" ? 48 : 32;
}

function quebrarTexto(texto: string, cols: number) {
  texto = String(texto || "");
  if (texto.length <= cols) return [texto];
  const linhas: string[] = [];
  let atual = "";
  texto.split(" ").forEach((palavra) => {
    if ((atual + " " + palavra).trim().length > cols) {
      if (atual) linhas.push(atual.trim());
      atual = palavra;
    } else {
      atual = (atual + " " + palavra).trim();
    }
  });
  if (atual) linhas.push(atual);
  return linhas;
}

function linhaValor(rotulo: string, valor: string, cols: number) {
  const espaco = cols - rotulo.length - valor.length;
  return rotulo + (espaco > 0 ? " ".repeat(espaco) : " ") + valor;
}

function formatMoney(v: unknown) {
  return (parseFloat(String(v ?? 0)) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tipoLabel(tipo: unknown) {
  return ({ entrega: "Entrega", retirada: "Retirada", mesa: "Mesa", venda_rapida: "Venda rápida" } as Record<string, string>)[String(tipo)] || "Pedido";
}

function formaPagamentoLabel(forma: unknown) {
  const mapa: Record<string, string> = {
    pix: "Pix", dinheiro: "Dinheiro", credito: "Cartão de crédito", debito: "Cartão de débito",
    voucher: "Voucher", outro: "Outro", resgate: "Resgate de pontos", fiado: "Fiado",
  };
  return mapa[String(forma || "").toLowerCase()] || String(forma || "-");
}

/* Endereco vem em dois formatos: PDV ("Rua X, 600 | Bairro: Y | Cidade: Z | CEP: ... | Complemento: W")
   ou loja publica ("Rua X, 600, Complemento, Bairro, Cidade/UF, CEP 12345678"). */
function parseEndereco(texto: string) {
  texto = String(texto || "").trim();
  const r = { ruaNumero: "", bairro: "", cidade: "", cep: "", complemento: "" };
  if (!texto) return r;

  if (texto.includes(" | ")) {
    texto.split(" | ").map((p) => p.trim()).forEach((parte, i) => {
      if (i === 0) {
        r.ruaNumero = parte;
        return;
      }
      const m = parte.match(/^([^:]+):\s*(.*)$/);
      if (!m) return;
      const chave = m[1].trim().toLowerCase();
      const valor = m[2].trim();
      if (chave === "bairro") r.bairro = valor;
      else if (chave === "cidade") r.cidade = valor;
      else if (chave === "cep") r.cep = valor;
      else if (chave === "complemento") r.complemento = valor;
    });
    return r;
  }

  let restante = texto;
  const cepMatch = restante.match(/,?\s*CEP\s+([\d.\-]+)\s*$/i);
  if (cepMatch) {
    r.cep = cepMatch[1];
    restante = restante.slice(0, cepMatch.index);
  }
  const cidadeMatch = restante.match(/,\s*([^,]+\/[A-Za-z]{2})\s*$/);
  if (cidadeMatch) {
    r.cidade = cidadeMatch[1].trim();
    restante = restante.slice(0, cidadeMatch.index);
  }
  const partes = restante.split(",").map((p) => p.trim()).filter(Boolean);
  let rua = partes.shift() || "";
  if (partes.length && /^\d+[A-Za-z]?$/.test(partes[0])) rua += ", " + partes.shift();
  r.ruaNumero = rua;
  if (partes.length === 2) {
    r.complemento = partes[0];
    r.bairro = partes[1];
  } else if (partes.length === 1) {
    r.bairro = partes[0];
  }
  return r;
}

function linha(texto: string, opts: Partial<Omit<Linha, "texto">> = {}): Linha {
  return { texto, bold: !!opts.bold, big: !!opts.big, align: opts.align || "left", quebra: !!opts.quebra };
}

function numeroPedido(pedido: Dados["pedido"]) {
  const n = pedido.codigo ?? pedido.id ?? 0;
  return /^\d+$/.test(String(n)) ? String(n).padStart(4, "0") : String(n);
}

function nomeBaseItem(produtoNome: string) {
  const idx = produtoNome.search(/ - | \+ /);
  return idx === -1 ? produtoNome : produtoNome.slice(0, idx);
}

function agruparOpcoes(opcoes: { titulo: string; nome: string; quantidade?: number }[]) {
  const grupos: { titulo: string; nomes: string[] }[] = [];
  for (const o of opcoes) {
    let g = grupos.find((x) => x.titulo === o.titulo);
    if (!g) grupos.push((g = { titulo: o.titulo, nomes: [] }));
    g.nomes.push((o.quantidade ?? 1) > 1 ? `${o.quantidade}x ${o.nome}` : o.nome);
  }
  return grupos;
}

function construirLinhasCupom(dados: Dados, perfil: PerfilImpressao): Linha[] {
  const cols = largura(perfil.papel);
  const { pedido, itens, pagamentos } = dados;
  const completa = perfil.tipoImpressao === "completa";
  const linhas: Linha[] = [];

  linhas.push(linha(dados.loja_nome || "Pedido", { bold: true, big: true, align: "center" }));
  linhas.push(linha("Pedido #" + numeroPedido(pedido), { bold: true, big: true, align: "center" }));
  linhas.push(linha(tipoLabel(pedido.tipo), { bold: true, big: true, align: "center" }));
  if (pedido.criado_em) {
    const d = new Date(String(pedido.criado_em).replace(" ", "T"));
    if (!isNaN(d.getTime())) linhas.push(linha(d.toLocaleString("pt-BR"), { align: "center" }));
  }
  if (pedido.mesa_nome) linhas.push(linha("Mesa: " + pedido.mesa_nome, { bold: true, align: "center" }));
  if (dados.id_curto) linhas.push(linha("id: " + dados.id_curto, { align: "center" }));
  linhas.push(linha(""));

  linhas.push(linha("Itens do pedido"));
  linhas.push(linha(""));
  (itens || []).forEach((item) => {
    const opcoes = item.opcoes ?? [];
    /* Com as opcoes estruturadas, imprime o nome base ("Açaí") e as escolhas em lista,
       em vez do nome concatenado ("Açaí - Tradicional + Creme"). */
    const nome = opcoes.length ? nomeBaseItem(item.produto_nome) : item.produto_nome;
    linhas.push(linha(linhaValor(item.quantidade + " x " + nome, formatMoney(item.preco * item.quantidade), cols), { quebra: true }));
    for (const grupo of agruparOpcoes(opcoes)) {
      if (perfil.mostrarGruposComplementos && grupo.titulo) {
        linhas.push(linha("  " + grupo.titulo + ":", { quebra: true }));
        grupo.nomes.forEach((n) => linhas.push(linha("    - " + n, { quebra: true })));
      } else {
        grupo.nomes.forEach((n) => linhas.push(linha("  - " + n, { quebra: true })));
      }
    }
    if (item.observacoes) {
      const obs = item.observacoes;
      const prefixo = obs.startsWith("[combo]\n") ? "[combo]\n" : obs.startsWith("[complementos]\n") ? "[complementos]\n" : null;
      if (prefixo) {
        obs.substring(prefixo.length).split("\n").filter((l) => l.trim()).forEach((l) => linhas.push(linha("  • " + l, { quebra: true })));
      } else {
        linhas.push(linha("  obs: " + obs, { quebra: true }));
      }
    }
    if (completa && (item.pontos ?? 0) > 0) linhas.push(linha("   +" + item.pontos + " pts"));
  });

  if (pedido.observacoes_cliente) {
    linhas.push(linha(""));
    linhas.push(linha("Obs: " + pedido.observacoes_cliente, { bold: true, quebra: true }));
  }

  linhas.push(linha(""));
  if (completa) {
    linhas.push(linha(linhaValor("Valor dos itens:", formatMoney(pedido.subtotal), cols)));
    if (pedido.tipo === "entrega" && parseFloat(String(pedido.taxa_entrega ?? 0)) > 0) {
      linhas.push(linha(linhaValor("Taxa de entrega:", formatMoney(pedido.taxa_entrega), cols)));
    }
    if (parseFloat(String(pedido.desconto ?? 0)) > 0) linhas.push(linha(linhaValor("Desconto:", "-" + formatMoney(pedido.desconto), cols)));
    if ((dados.cashback_usado ?? 0) > 0) linhas.push(linha(linhaValor("Cashback usado:", formatMoney(dados.cashback_usado), cols)));
    if ((dados.pontos_a_receber ?? 0) > 0) linhas.push(linha(linhaValor("Pontos a receber:", dados.pontos_a_receber + " pts", cols)));
  }
  linhas.push(linha(linhaValor("Valor total:", formatMoney(pedido.total), cols), { bold: true }));

  const listaPagamentos =
    pagamentos && pagamentos.length
      ? pagamentos
      : pedido.forma_pagamento
        ? [{ forma: String(pedido.forma_pagamento), valor: Number(pedido.valor_pago || pedido.total) }]
        : [];
  if (listaPagamentos.length) {
    linhas.push(linha(""));
    linhas.push(linha("Formas de pagamento:"));
    listaPagamentos.forEach((pg) => {
      linhas.push(linha(linhaValor("Metodo:", formaPagamentoLabel(pg.forma), cols)));
      linhas.push(linha(linhaValor("Valor:", formatMoney(pg.valor), cols)));
      if (String(pg.forma || "").toLowerCase() === "dinheiro") {
        const troco = parseFloat(String(pedido.troco ?? 0));
        linhas.push(linha(linhaValor("Troco:", troco > 0 ? formatMoney(troco) : "Nao", cols)));
      }
    });
  }

  linhas.push(linha(""));
  linhas.push(linha("Nome:"));
  if (pedido.nome) linhas.push(linha(String(pedido.nome), { quebra: true }));
  if (pedido.telefone) linhas.push(linha(linhaValor("Telefone:", String(pedido.telefone), cols)));
  if (completa) {
    if (dados.pedidos_na_loja !== undefined) linhas.push(linha(linhaValor("Pedidos na loja:", String(dados.pedidos_na_loja), cols)));
    if ((dados.cashback_ganho ?? 0) > 0) linhas.push(linha(linhaValor("Cashback ganho:", formatMoney(dados.cashback_ganho), cols)));
  }

  if (pedido.tipo === "entrega") {
    linhas.push(linha(""));
    linhas.push(linha(pedido.motoboy_nome ? "Entregador: " + pedido.motoboy_nome : "Entrega da loja", { align: "center" }));
    if (pedido.endereco_entrega) {
      const end = parseEndereco(String(pedido.endereco_entrega));
      linhas.push(linha(""));
      linhas.push(linha("Rua:"));
      if (end.ruaNumero) linhas.push(linha(end.ruaNumero, { quebra: true }));
      const bairroCidade = [end.bairro, end.cidade].filter(Boolean).join(" - ");
      if (bairroCidade) linhas.push(linha(bairroCidade, { quebra: true }));
      if (end.cep) {
        linhas.push(linha(""));
        linhas.push(linha(linhaValor("CEP:", end.cep, cols)));
      }
      if (end.complemento) {
        linhas.push(linha("Complemento:"));
        linhas.push(linha(end.complemento, { quebra: true }));
      }
    }
  }

  if (completa) {
    linhas.push(linha(""));
    linhas.push(linha("Loja: " + (dados.loja_nome || ""), { quebra: true }));
    if (dados.loja_cnpj) linhas.push(linha("CNPJ: " + dados.loja_cnpj));
  }

  return linhas;
}

function construirLinhasTeste(lojaNome: string, perfil: PerfilImpressao): Linha[] {
  const cols = largura(perfil.papel);
  return [
    linha(lojaNome || "LillyMenu", { bold: true, big: true, align: "center" }),
    linha("TESTE DE IMPRESSAO", { bold: true, align: "center" }),
    linha(new Date().toLocaleString("pt-BR"), { align: "center" }),
    linha(""),
    linha(perfil.nome + " - " + perfil.papel, { align: "center", quebra: true }),
    linha("-".repeat(cols)),
    linha("Se voce esta lendo isso, a impressora esta configurada corretamente.", { quebra: true }),
  ];
}

/* Impressoras termicas costumam usar a code page CP850/CP860; sem acento evitamos
   caracteres estranhos no papel, independente da code page configurada nela. */
function semAcento(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/•/g, "-");
}

/* Fonte "medio" = altura dupla (ESC ! 0x10): mesma quantidade de colunas, letra mais alta
   e legivel na cozinha. Titulos (big) seguem altura+largura dupla (0x30). */
function renderizarEscPos(linhas: Linha[], perfil: PerfilImpressao) {
  const cols = largura(perfil.papel);
  const modoNormal = perfil.tamanhoFonte === "medio" ? "\x10" : "\x00";
  let t = ESC + "@";
  linhas.forEach((l) => {
    t += ESC + "a" + (l.align === "center" ? "\x01" : "\x00");
    t += ESC + "!" + (l.big ? "\x30" : modoNormal);
    if (l.bold) t += ESC + "E" + "\x01";
    const textos = l.quebra ? quebrarTexto(l.texto, l.big ? Math.floor(cols / 2) : cols) : [l.texto];
    textos.forEach((txt) => {
      t += semAcento(txt) + "\n";
    });
    if (l.bold) t += ESC + "E" + "\x00";
  });
  t += ESC + "!" + "\x00";
  t += "\n\n\n";
  t += GS + "V" + "\x01";
  return t;
}

export function previaTeste(perfil: PerfilImpressao, lojaNome: string) {
  const cols = largura(perfil.papel);
  return construirLinhasTeste(lojaNome, perfil).flatMap((l) => (l.quebra ? quebrarTexto(l.texto, cols) : [l.texto]).map((texto) => ({ ...l, texto })));
}

/* ---------- envio ---------- */

async function enviar(perfil: PerfilImpressao, textoEscPos: string) {
  if (!perfil.qzPrinterName) throw new Error(`A impressora "${perfil.nome}" não está vinculada a nenhuma impressora do computador.`);
  await garantirConexao();
  const qz = await carregarQZ();
  const config = qz.configs.create(perfil.qzPrinterName, { copies: Math.max(1, perfil.copias || 1) });
  await qz.print(config, [{ type: "raw", format: "command", flavor: "plain", data: textoEscPos }]);
}

export async function imprimirPedido(dados: Dados, perfil: PerfilImpressao, lojaNome: string) {
  const d = { ...dados, loja_nome: dados.loja_nome || lojaNome };
  return enviar(perfil, renderizarEscPos(construirLinhasCupom(d, perfil), perfil));
}

export async function imprimirTeste(perfil: PerfilImpressao, lojaNome: string) {
  return enviar(perfil, renderizarEscPos(construirLinhasTeste(lojaNome, perfil), perfil));
}

async function buscarDadosPedido(pedidoId: string | number): Promise<Dados> {
  const resp = await fetch(`/api/impressao/pedido?pedido_id=${encodeURIComponent(String(pedidoId))}`, { cache: "no-store" });
  const dados = await resp.json().catch(() => ({ ok: false }));
  if (!dados.ok) throw new Error(dados.msg || "Não foi possível carregar os dados do pedido.");
  return dados as Dados;
}

/* ---------- fila entre computadores ---------- */

type Trabalho = { id: number; pedido_id: number; perfil_id: string; status: string; erro: string | null };

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nomesDe = (perfis: PerfilImpressao[]) => perfis.map((p) => `"${p.nome}"`).join(", ");

function criarTrabalhos(pedidoId: string | number, perfis: PerfilImpressao[]) {
  return api<{ ok: true; ids: number[] }>("/api/impressao/fila", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedido_id: Number(pedidoId), perfis: perfis.map((p) => p.id) }),
  });
}

/* Manda pro computador que tem a impressora e espera a resposta (ate ~20s). Devolve a mensagem de sucesso. */
async function imprimirEmOutroComputador(pedidoId: string | number, perfis: PerfilImpressao[]): Promise<string> {
  const { ids } = await criarTrabalhos(pedidoId, perfis);
  let trabalhos: Trabalho[] = [];
  const limite = Date.now() + 20_000;
  while (Date.now() < limite) {
    await esperar(1500);
    trabalhos = (await api<{ ok: true; trabalhos: Trabalho[] }>(`/api/impressao/fila?ids=${ids.join(",")}`)).trabalhos;
    if (trabalhos.every((t) => t.status !== "pendente" && t.status !== "imprimindo")) break;
  }
  const pendentes = trabalhos.filter((t) => t.status === "pendente");
  if (pendentes.length) {
    // ninguem pegou: desiste, pra nao imprimir "do nada" quando o outro computador abrir mais tarde
    await api(`/api/impressao/fila?ids=${pendentes.map((t) => t.id).join(",")}`, { method: "DELETE" }).catch(() => {});
  }
  const perfilDe = (t: Trabalho) => perfis.find((p) => p.id === t.perfil_id);
  const ok = trabalhos.filter((t) => t.status === "impresso" || t.status === "imprimindo");
  const falhas = trabalhos.filter((t) => t.status === "erro");
  const problemas = [
    ...falhas.map((t) => `O computador da impressora "${perfilDe(t)?.nome ?? ""}" não conseguiu imprimir: ${t.erro ?? "erro desconhecido"}`),
    ...(pendentes.length
      ? [
          `Nenhum computador com a impressora ${nomesDe(pendentes.map(perfilDe).filter((p): p is PerfilImpressao => !!p))} está com o sistema aberto agora. Abra o sistema no computador da impressora e tente de novo.`,
        ]
      : []),
  ];
  if (!ok.length) throw new Error(problemas.join(" ") || "Não foi possível imprimir.");
  const msg = `Pedido enviado para ${nomesDe(ok.map(perfilDe).filter((p): p is PerfilImpressao => !!p))} (outro computador).`;
  return problemas.length ? `${msg} ${problemas.join(" ")}` : msg;
}

/* Imprime aqui nas impressoras vinculadas neste computador; as outras vao pela fila pro computador delas. */
function separarPorComputador(perfis: PerfilImpressao[]) {
  return { aqui: perfis.filter((p) => p.qzPrinterName), outros: perfis.filter((p) => !p.qzPrinterName) };
}

/* Impressao pelo botao "Imprimir" — usa as impressoras da loja do uso, com ou sem automatica.
   Sem uso: prefere as do PDV/caixa (pdv/ambos); se a loja nao tiver, usa todas.
   As vinculadas neste computador imprimem aqui; as demais vao pro computador que tem a impressora. */
export async function imprimirManual(pedidoId: string | number, lojaNome: string, uso?: string): Promise<string> {
  const daLoja = await perfisAtuais();
  let perfis = daLoja.filter((p) => p.usoPara === (uso ?? "pdv") || p.usoPara === "ambos");
  if (!uso && !perfis.length) perfis = daLoja;
  if (!perfis.length) throw new Error("Nenhuma impressora cadastrada na loja. Configure em Configurações > Impressão.");

  // se alguma do uso estiver aqui, imprime so aqui (o caixa nao precisa mandar pro outro computador)
  const { aqui, outros } = separarPorComputador(perfis);
  if (aqui.length) {
    const dados = await buscarDadosPedido(pedidoId);
    for (const perfil of aqui) await imprimirPedido(dados, perfil, lojaNome);
    return `Pedido enviado para ${nomesDe(aqui)}.`;
  }
  return imprimirEmOutroComputador(pedidoId, outros);
}

/* Impressao automatica (ao fechar venda no PDV/garcom) — best-effort, nunca lanca.
   Impressoras vinculadas aqui imprimem aqui; as outras vao pela fila (sem esperar). */
export async function imprimirAutomaticoPedido(uso: string, pedidoId: string | number, lojaNome: string) {
  try {
    const { aqui, outros } = separarPorComputador(await perfisPara(uso));
    if (outros.length) {
      criarTrabalhos(pedidoId, outros).catch((e) => console.warn("Falha ao mandar impressão para outro computador:", e));
    }
    if (!aqui.length) return;
    const dados = await buscarDadosPedido(pedidoId);
    for (const perfil of aqui) {
      try {
        await imprimirPedido(dados, perfil, lojaNome);
      } catch (e) {
        console.warn(`Falha ao imprimir automaticamente (${perfil.nome}):`, e);
      }
    }
  } catch (e) {
    console.warn("Falha ao buscar detalhe do pedido para impressão automática:", e);
  }
}

/* Lado do computador que tem a impressora: pega os trabalhos das impressoras vinculadas aqui e imprime. */
let processandoFila = false;

async function processarFila() {
  const vinculadas = listarPerfis().filter((p) => p.qzPrinterName);
  if (!vinculadas.length || processandoFila) return; // sem impressora aqui: nem pergunta ao servidor
  processandoFila = true;
  try {
    const { trabalhos } = await api<{ ok: true; trabalhos: Trabalho[] }>("/api/impressao/fila/pegar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perfis: vinculadas.map((p) => p.id) }),
    });
    for (const t of trabalhos) {
      let resultado: { ok: boolean; erro?: string } = { ok: true };
      try {
        const perfil = vinculadas.find((p) => p.id === t.perfil_id);
        if (!perfil) throw new Error("Impressora não vinculada neste computador.");
        await imprimirPedido(await buscarDadosPedido(t.pedido_id), perfil, "");
      } catch (e) {
        resultado = { ok: false, erro: mensagemErroQZ(e) };
      }
      await api("/api/impressao/fila/pegar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concluir: t.id, ...resultado }),
      }).catch(() => {});
    }
  } catch {
    /* sem rede / sessao expirada: tenta no proximo ciclo */
  } finally {
    processandoFila = false;
  }
}

/* Timer num Web Worker: o navegador nao segura (throttling) timers de worker quando a aba
   fica em segundo plano — o computador da impressora costuma estar com o sistema minimizado. */
function criarTimer(ms: number, cb: () => void): () => void {
  try {
    const src = `setInterval(function(){postMessage(0)},${ms})`;
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const w = new Worker(url);
    w.onmessage = cb;
    return () => {
      w.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    const t = setInterval(cb, ms);
    return () => clearInterval(t);
  }
}

/* Liga o atendimento da fila neste computador (chamado uma vez pelo AppShell). Devolve o "desligar". */
export function iniciarFilaImpressao(): () => void {
  sincronizarPerfis().catch(() => {});
  const pararFila = criarTimer(3000, () => void processarFila());
  // configuracoes das impressoras podem mudar em outro computador
  const pararSync = criarTimer(120_000, () => void sincronizarPerfis().catch(() => {}));
  return () => {
    pararFila();
    pararSync();
  };
}

/* Mensagem amigavel pros erros mais comuns do QZ Tray. */
export function mensagemErroQZ(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  if (/Unable to establish connection|websocket|ECONNREFUSED|Failed to connect/i.test(msg)) {
    return "QZ Tray não encontrado neste computador. Instale e abra o QZ Tray e tente de novo.";
  }
  if (/rejected|blocked|denied|untrusted/i.test(msg)) {
    return "O QZ Tray bloqueou este site. Abra o QZ Tray > Site Manager e permita o acesso.";
  }
  if (/not found|Cannot find printer|Specified printer could not be found/i.test(msg)) {
    return "A impressora não foi encontrada. Verifique se ela está ligada e instalada no Windows.";
  }
  return msg || "Erro desconhecido ao imprimir.";
}

const apiGlobal = {
  listarPerfis,
  salvarPerfil,
  excluirPerfil,
  listarImpressorasSistema,
  imprimirPedido,
  imprimirManual,
  imprimirTeste,
  imprimirAutomaticoPedido,
  garantirConexao,
};

export function instalarImpressaoQZ() {
  if (typeof window !== "undefined") window.impressaoQZ = apiGlobal;
  return apiGlobal;
}

instalarImpressaoQZ();
