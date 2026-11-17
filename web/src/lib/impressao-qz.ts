"use client";

/*
 * Impressao termica via QZ Tray (ESC/POS cru) — port de admin/assets/js/impressao_qz.js
 * pra dentro do Next, com a biblioteca qz-tray do npm. Antes o Next carregava o script
 * do painel PHP via <Script>, mas: (1) a biblioteca qz-tray.js nunca era carregada, entao
 * "qz" nao existia e a conexao sempre falhava; (2) a URL saia como /admin/admin/...;
 * (3) os dados do pedido vinham de "api/pdv_detalhe.php" relativo, que nao existe no Next.
 *
 * Os perfis de impressora ficam no localStorage deste navegador (cada computador do
 * caixa/cozinha tem suas proprias impressoras), na mesma chave usada pelo painel PHP.
 * Tambem expoe window.impressaoQZ pra manter compativeis os chamadores existentes.
 */
import { useMemo, useSyncExternalStore } from "react";
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

const STORAGE_KEY = "lm_impressoras";
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

export function listarPerfis(): PerfilImpressao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const EVENTO_PERFIS = "lm-impressoras-alteradas";

function salvarPerfis(perfis: PerfilImpressao[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perfis));
  } catch {
    /* modo privado / storage bloqueado */
  }
  window.dispatchEvent(new Event(EVENTO_PERFIS));
}

function assinarPerfis(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && cb();
  window.addEventListener(EVENTO_PERFIS, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENTO_PERFIS, cb);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshotPerfis() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

/* Perfis salvos neste navegador, reativo (atualiza quando outro componente/aba salva). */
export function usePerfisImpressao(): PerfilImpressao[] {
  const raw = useSyncExternalStore(assinarPerfis, snapshotPerfis, () => "[]");
  return useMemo(() => {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }, [raw]);
}

export function salvarPerfil(perfil: PerfilImpressao): PerfilImpressao {
  const perfis = listarPerfis();
  const salvo = { ...perfil, id: perfil.id || `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` };
  const idx = perfis.findIndex((p) => p.id === salvo.id);
  if (idx >= 0) perfis[idx] = salvo;
  else perfis.push(salvo);
  salvarPerfis(perfis);
  return salvo;
}

export function excluirPerfil(id: string) {
  salvarPerfis(listarPerfis().filter((p) => p.id !== id));
}

function perfisPara(uso: string) {
  return listarPerfis().filter((p) => p.impressaoAutomatica && (p.usoPara === uso || p.usoPara === "ambos"));
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

/* Impressao pelo botao "Imprimir" — usa todas as impressoras do uso, com ou sem automatica. */
export async function imprimirManual(pedidoId: string | number, lojaNome: string, uso = "cozinha") {
  const perfis = listarPerfis().filter((p) => p.usoPara === uso || p.usoPara === "ambos");
  if (!perfis.length) throw new Error("Nenhuma impressora configurada. Configure em Configurações > Impressão.");
  const dados = await buscarDadosPedido(pedidoId);
  for (const perfil of perfis) await imprimirPedido(dados, perfil, lojaNome);
}

/* Impressao automatica (ao fechar venda no PDV/garcom) — best-effort, nunca lanca. */
export async function imprimirAutomaticoPedido(uso: string, pedidoId: string | number, lojaNome: string) {
  const perfis = perfisPara(uso);
  if (!perfis.length) return;
  try {
    const dados = await buscarDadosPedido(pedidoId);
    for (const perfil of perfis) {
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

const api = {
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
  if (typeof window !== "undefined") window.impressaoQZ = api;
  return api;
}

instalarImpressaoQZ();
