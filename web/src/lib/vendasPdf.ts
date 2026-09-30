import "server-only";
import PDFDocument from "pdfkit";
import { STATUS_LABELS, TIPO_LABELS } from "@/components/ordermanager/constants";
import type { RelatorioVendasResultado } from "@/db/queries/relatoriosVendas";

/* PDF elegante do relatorio de vendas (/sales), no mesmo estilo visual do
   orcamentoPdf.ts (mesmas cores, margem e helpers de tabela/caixa). */

export type DadosPdfVendas = {
  loja: { nome: string; logoUrl: string };
  periodoLabel: string;
  tipoLabel: string;
  relatorio: RelatorioVendasResultado;
};

const COR = { texto: "#0f172a", suave: "#64748b", borda: "#e2e8f0", fundo: "#f8fafc", claro: "#94a3b8", marca: "#9c5523", marcaClara: "#fbf0e7", positivo: "#059669", negativo: "#dc2626" };
const M = 40;

const PAGAMENTO_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  sem_pagamento: "Sem pagamento",
};

function brl(v: number): string {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dataHoraCurta(isoComEspaco: string): string {
  const d = new Date(isoComEspaco.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return isoComEspaco;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function baixarImagem(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const jpg = buf[0] === 0xff && buf[1] === 0xd8;
    const png = buf[0] === 0x89 && buf[1] === 0x50;
    return jpg || png ? buf : null;
  } catch {
    return null;
  }
}

function dataHoraFortaleza(): string {
  const d = new Date();
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return `${data} às ${hora}`;
}

export async function gerarPdfVendas(dados: DadosPdfVendas): Promise<Buffer> {
  const logo = await baixarImagem(dados.loja.logoUrl);
  const { relatorio: r } = dados;

  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: "Relatório de Vendas" } });
  const partes: Buffer[] = [];
  doc.on("data", (c: Buffer) => partes.push(c));
  const fim = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(partes))));

  const largura = doc.page.width - M * 2;
  const rodapeY = () => doc.page.height - M;
  const garantirEspaco = (altura: number) => {
    if (doc.y + altura > rodapeY()) doc.addPage();
  };

  /* Cabecalho: logo + nome da loja + titulo */
  const yTopo = doc.y;
  if (logo) {
    try {
      doc.image(logo, M, yTopo, { fit: [44, 44] });
    } catch {
      /* segue sem logo */
    }
  }
  const xTexto = logo ? M + 56 : M;
  doc.fillColor(COR.texto).font("Helvetica-Bold").fontSize(18).text("Relatório de Vendas", xTexto, yTopo, { width: largura - (xTexto - M) });
  doc.font("Helvetica").fontSize(11).fillColor(COR.suave).text(dados.loja.nome, xTexto, doc.y + 2, { width: largura - (xTexto - M) });
  doc.y = Math.max(doc.y, yTopo + 44) + 10;

  /* Faixa com periodo/tipo/emissao */
  garantirEspaco(30);
  doc.rect(M, doc.y, largura, 26).fill(COR.marcaClara);
  const yFaixa = doc.y + 8;
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COR.marca);
  doc.text(`PERÍODO: ${dados.periodoLabel}`, M + 12, yFaixa, { continued: true, width: largura - 24 });
  doc.font("Helvetica").fillColor(COR.suave).text(`   •   Tipo: ${dados.tipoLabel}   •   Emitido em ${dataHoraFortaleza()}`);
  doc.y = yFaixa + 22;
  doc.moveDown(0.6);

  /* KPIs em grade de caixinhas */
  const kpis: { label: string; valor: string; cor?: string }[] = [
    { label: "Faturamento", valor: brl(r.resumo.faturamento), cor: COR.positivo },
    { label: "Ticket médio", valor: brl(r.resumo.ticketMedio) },
    { label: "Pedidos", valor: String(r.resumo.totalPedidos) },
    { label: "Taxas de entrega", valor: brl(r.resumo.taxaEntrega) },
    { label: "Cancelados", valor: String(r.cancelados), cor: r.cancelados > 0 ? COR.negativo : undefined },
    { label: "Valor cancelado", valor: brl(r.canceladosValor), cor: r.canceladosValor > 0 ? COR.negativo : undefined },
    { label: "Fiado recebido", valor: brl(r.fiadoRecebido) },
  ];
  const colunas = 4;
  const gap = 8;
  const larguraCaixa = (largura - gap * (colunas - 1)) / colunas;
  const alturaCaixa = 46;
  const linhasKpi = Math.ceil(kpis.length / colunas);
  garantirEspaco(alturaCaixa * linhasKpi + gap * (linhasKpi - 1));
  const yInicioKpi = doc.y;
  kpis.forEach((k, i) => {
    const col = i % colunas;
    const lin = Math.floor(i / colunas);
    const x = M + col * (larguraCaixa + gap);
    const y = yInicioKpi + lin * (alturaCaixa + gap);
    doc.roundedRect(x, y, larguraCaixa, alturaCaixa, 6).fillAndStroke(COR.fundo, COR.borda);
    doc.font("Helvetica").fontSize(8).fillColor(COR.suave).text(k.label.toUpperCase(), x + 10, y + 9, { width: larguraCaixa - 20, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(12.5).fillColor(k.cor ?? COR.texto).text(k.valor, x + 10, y + 22, { width: larguraCaixa - 20, lineBreak: false });
  });
  doc.y = yInicioKpi + linhasKpi * (alturaCaixa + gap) + 6;
  doc.x = M;

  /* Tabela reutilizavel com cabecalho repetido em nova pagina */
  const tabela = (titulo: string, colunasDef: { titulo: string; largura: number; alinhar: "left" | "center" | "right" }[], linhas: string[][]) => {
    garantirEspaco(50);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(COR.texto).text(titulo, M, doc.y);
    doc.moveDown(0.35);

    if (linhas.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor(COR.claro).text("Sem dados no período.", M, doc.y);
      doc.moveDown(0.8);
      return;
    }

    const xs: number[] = [];
    let x = M;
    for (const c of colunasDef) {
      xs.push(x);
      x += c.largura;
    }
    const cabecalho = () => {
      doc.rect(M, doc.y, largura, 20).fill(COR.fundo);
      const yc = doc.y + 6;
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COR.suave);
      colunasDef.forEach((c, i) => doc.text(c.titulo.toUpperCase(), xs[i] + 6, yc, { width: c.largura - 12, align: c.alinhar }));
      doc.y += 20;
    };
    cabecalho();
    doc.font("Helvetica").fontSize(9.5);
    linhas.forEach((linha, li) => {
      const altura = Math.max(...linha.map((t, i) => doc.heightOfString(t, { width: colunasDef[i].largura - 12 }))) + 12;
      if (doc.y + altura > rodapeY()) {
        doc.addPage();
        cabecalho();
        doc.font("Helvetica").fontSize(9.5);
      }
      const y = doc.y;
      if (li % 2 === 1) doc.rect(M, y, largura, altura).fill(COR.fundo);
      linha.forEach((t, i) => doc.fillColor(COR.texto).font("Helvetica").fontSize(9.5).text(t, xs[i] + 6, y + 6, { width: colunasDef[i].largura - 12, align: colunasDef[i].alinhar }));
      doc.y = y + altura;
    });
    doc.moveTo(M, doc.y).lineTo(M + largura, doc.y).strokeColor(COR.borda).lineWidth(0.5).stroke();
    doc.moveDown(0.8);
  };

  tabela(
    "Vendas por forma de pagamento",
    [
      { titulo: "Forma de pagamento", largura: largura - 240, alinhar: "left" },
      { titulo: "Quantidade", largura: 120, alinhar: "right" },
      { titulo: "Total", largura: 120, alinhar: "right" },
    ],
    r.vendasPagamento.map((v) => [PAGAMENTO_LABELS[v.forma] ?? v.forma, String(v.quantidade), brl(v.total)])
  );

  tabela(
    "Produtos mais vendidos",
    [
      { titulo: "Produto", largura: largura - 140, alinhar: "left" },
      { titulo: "Unidades", largura: 140, alinhar: "right" },
    ],
    r.produtos.map((p) => [p.nome, String(p.quantidade)])
  );

  tabela(
    "Vendas por produto",
    [
      { titulo: "Produto", largura: largura - 240, alinhar: "left" },
      { titulo: "Quantidade", largura: 120, alinhar: "right" },
      { titulo: "Total", largura: 120, alinhar: "right" },
    ],
    r.vendasProdutos.map((p) => [p.nome, String(p.quantidade), brl(p.total)])
  );

  tabela(
    "Melhores clientes",
    [
      { titulo: "Cliente", largura: largura - 140, alinhar: "left" },
      { titulo: "Pedidos", largura: 140, alinhar: "right" },
    ],
    r.clientesFrequencia.map((c) => [c.nome, String(c.pedidos)])
  );

  tabela(
    `Pedidos do período (${r.pedidos.length})`,
    [
      { titulo: "Nº", largura: 40, alinhar: "left" },
      { titulo: "Cliente", largura: largura - 40 - 90 - 80 - 70 - 70 - 90, alinhar: "left" },
      { titulo: "Data", largura: 90, alinhar: "left" },
      { titulo: "Pagamento", largura: 80, alinhar: "left" },
      { titulo: "Status", largura: 70, alinhar: "left" },
      { titulo: "Tipo", largura: 70, alinhar: "left" },
      { titulo: "Valor", largura: 90, alinhar: "right" },
    ],
    r.pedidos.map((p) => [
      `#${p.codigo}`,
      p.cliente,
      dataHoraCurta(p.criadoEm),
      p.formaPagamento ? (PAGAMENTO_LABELS[p.formaPagamento] ?? p.formaPagamento) : "-",
      STATUS_LABELS[p.status] ?? p.status,
      TIPO_LABELS[p.tipo] ?? p.tipo,
      brl(p.total),
    ])
  );

  /* Numeracao de pagina no rodape */
  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(8).fillColor(COR.claro).text(`Página ${i + 1} de ${paginas.count}`, M, doc.page.height - 26, { width: largura, align: "center" });
  }

  doc.end();
  return fim;
}
