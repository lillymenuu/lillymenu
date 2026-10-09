import "server-only";
import PDFDocument from "pdfkit";
import { STATUS_LABELS, TIPO_LABELS, TIPO_CORES } from "@/components/ordermanager/constants";

/*
 * Nota de pedido em PDF (preview no PrintReceiptDialog + download), no mesmo
 * estilo visual de vendasPdf.ts/orcamentoPdf.ts (pdfkit direto, sem HTML).
 */

const ORIGEM_LABELS: Record<string, string> = {
  balcao: "Feito pelo balcão",
  loja: "Feito pela loja",
  online: "Feito online",
  site: "Feito pelo site",
  whatsapp: "Feito pelo WhatsApp",
};

const PAGAMENTO_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  sem_pagamento: "Sem pagamento",
};

export type DadosPdfPedidoItemOpcao = { titulo: string; nome: string };
export type DadosPdfPedidoItem = { nome: string; quantidade: number; preco: number; observacoes: string | null; opcoes: DadosPdfPedidoItemOpcao[] };
export type DadosPdfPedidoPagamento = { forma: string; valor: number };

export type DadosPdfPedido = {
  loja: { nome: string; logoUrl: string };
  pedido: {
    codigo: number;
    status: string;
    tipo: string;
    origem: string | null;
    criadoEm: string;
    agendamento: string | null;
    nome: string;
    telefone: string;
    enderecoEntrega: string | null;
    observacoesCliente: string | null;
    motoboyNome: string | null;
    subtotal: number;
    desconto: number;
    taxaEntrega: number;
    taxaMaquininha: number;
    cashbackValor: number;
    cashbackUsado: number;
    total: number;
  };
  itens: DadosPdfPedidoItem[];
  pagamentos: DadosPdfPedidoPagamento[];
};

const COR = { texto: "#0f172a", suave: "#64748b", borda: "#e2e8f0", fundo: "#f8fafc", claro: "#94a3b8" };
const M = 40;

function brl(v: number): string {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dataHora(isoComEspaco: string): string {
  const d = new Date(isoComEspaco.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return isoComEspaco;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function dataHoraFortaleza(): string {
  const d = new Date();
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return `${data} às ${hora}`;
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

export async function gerarPdfPedido(dados: DadosPdfPedido): Promise<Buffer> {
  const logo = await baixarImagem(dados.loja.logoUrl);
  const { pedido: p } = dados;

  const doc = new PDFDocument({ size: "A4", margin: M, info: { Title: `Pedido #${p.codigo}` } });
  const partes: Buffer[] = [];
  doc.on("data", (c: Buffer) => partes.push(c));
  const fim = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(partes))));

  const largura = doc.page.width - M * 2;
  const rodapeY = () => doc.page.height - M;
  const garantirEspaco = (altura: number) => {
    if (doc.y + altura > rodapeY()) doc.addPage();
  };

  /* Cabecalho: logo + nome da loja + numero do pedido em destaque */
  const yTopo = doc.y;
  if (logo) {
    try {
      doc.image(logo, M, yTopo, { fit: [44, 44] });
    } catch {
      /* segue sem logo */
    }
  }
  const xTexto = logo ? M + 56 : M;
  doc.fillColor(COR.texto).font("Helvetica-Bold").fontSize(11).text(dados.loja.nome.toUpperCase(), xTexto, yTopo, { width: largura - (xTexto - M) });
  doc.font("Helvetica").fontSize(9).fillColor(COR.suave).text(`Emitido em ${dataHoraFortaleza()}`, xTexto, doc.y + 2, { width: largura - (xTexto - M) });
  doc.y = Math.max(doc.y, yTopo + 44) + 14;
  doc.x = M;

  doc.font("Helvetica-Bold").fontSize(22).fillColor(COR.texto).text(`Pedido #${p.codigo}`, M, doc.y, { width: largura });
  doc.moveDown(0.15);
  const corTipo = TIPO_CORES[p.tipo] ?? COR.suave;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(corTipo).text(TIPO_LABELS[p.tipo] ?? p.tipo.toUpperCase(), M, doc.y, {
    width: largura,
    continued: !!p.origem,
  });
  if (p.origem) {
    doc.font("Helvetica").fillColor(COR.suave).text(`   •   ${ORIGEM_LABELS[p.origem] ?? p.origem}`);
  }
  doc.moveDown(0.8);

  /* Faixa com horario/status */
  garantirEspaco(30);
  doc.rect(M, doc.y, largura, 26).fill(COR.fundo);
  const yFaixa = doc.y + 8;
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COR.texto);
  doc.text(`HORÁRIO DO PEDIDO: ${dataHora(p.criadoEm)}`, M + 12, yFaixa, { continued: true, width: largura - 24 });
  doc.font("Helvetica").fillColor(COR.suave).text(`   •   Status: ${(STATUS_LABELS[p.status] ?? p.status).toUpperCase()}`);
  doc.y = yFaixa + 22;
  doc.moveDown(0.6);

  if (p.agendamento) {
    garantirEspaco(26);
    doc.rect(M, doc.y, largura, 22).fill("#fef3c7");
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#92400e").text(`AGENDADO PARA: ${dataHora(p.agendamento)}`, M, doc.y + 6, { width: largura, align: "center" });
    doc.y += 22;
    doc.moveDown(0.6);
  }

  /* Caixa de cliente / entrega */
  const caixa = (titulo: string, linhas: string[]) => {
    const linhasValidas = linhas.filter((l) => l.trim() !== "");
    if (linhasValidas.length === 0) return;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COR.suave);
    const alturaTitulo = doc.heightOfString(titulo.toUpperCase(), { width: largura - 20 }) + 6;
    doc.fontSize(10.5);
    const alturaLinhas = linhasValidas.reduce((h, l, i) => h + doc.font(i === 0 ? "Helvetica-Bold" : "Helvetica").heightOfString(l, { width: largura - 20 }) + 2, 0);
    const altura = alturaTitulo + alturaLinhas + 16;
    garantirEspaco(altura);
    const y = doc.y;
    doc.roundedRect(M, y, largura, altura, 6).fillAndStroke(COR.fundo, COR.borda);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COR.suave).text(titulo.toUpperCase(), M + 10, y + 8, { width: largura - 20 });
    doc.fontSize(10.5);
    let yl = y + 8 + alturaTitulo;
    linhasValidas.forEach((l, i) => {
      doc.font(i === 0 ? "Helvetica-Bold" : "Helvetica").fillColor(COR.texto).text(l, M + 10, yl, { width: largura - 20 });
      yl = doc.y + 2;
    });
    doc.y = y + altura + 12;
  };

  caixa("Cliente", [p.nome, p.telefone]);
  if (p.tipo === "entrega") {
    caixa("Entrega", [p.enderecoEntrega ?? "-", p.motoboyNome ? `Entregador: ${p.motoboyNome}` : "Sem entregador vinculado"]);
  }

  /* Tabela de itens */
  const colunas = [
    { titulo: "Item", largura: largura - 230, alinhar: "left" as const },
    { titulo: "Qtd", largura: 40, alinhar: "center" as const },
    { titulo: "Preço", largura: 95, alinhar: "right" as const },
    { titulo: "Subtotal", largura: 95, alinhar: "right" as const },
  ];
  const xs: number[] = [];
  let xAcc = M;
  for (const c of colunas) {
    xs.push(xAcc);
    xAcc += c.largura;
  }
  const cabecalhoTabela = () => {
    doc.rect(M, doc.y, largura, 22).fill(COR.fundo);
    const yc = doc.y + 7;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COR.suave);
    colunas.forEach((c, i) => doc.text(c.titulo.toUpperCase(), xs[i] + 6, yc, { width: c.largura - 12, align: c.alinhar }));
    doc.y += 22;
  };

  garantirEspaco(60);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COR.texto).text("Itens do pedido", M, doc.y);
  doc.moveDown(0.35);
  cabecalhoTabela();
  doc.font("Helvetica").fontSize(9.5);
  dados.itens.forEach((item) => {
    const linhasExtra = [
      ...item.opcoes.map((o) => `  ${o.titulo}: ${o.nome}`),
      ...(item.observacoes ? [`  Obs: ${item.observacoes}`] : []),
    ];
    const textoNome = [item.nome, ...linhasExtra].join("\n");
    const altura = Math.max(doc.heightOfString(textoNome, { width: colunas[0].largura - 12 }), 14) + 12;
    if (doc.y + altura > rodapeY()) {
      doc.addPage();
      cabecalhoTabela();
      doc.font("Helvetica").fontSize(9.5);
    }
    const y = doc.y;
    doc.fillColor(COR.texto).font("Helvetica-Bold").fontSize(9.5).text(item.nome, xs[0] + 6, y + 6, { width: colunas[0].largura - 12 });
    if (linhasExtra.length) {
      doc.font("Helvetica").fontSize(8.5).fillColor(COR.suave).text(linhasExtra.join("\n"), xs[0] + 6, doc.y + 1, { width: colunas[0].largura - 12 });
    }
    doc.font("Helvetica").fontSize(9.5).fillColor(COR.texto);
    doc.text(String(item.quantidade), xs[1] + 6, y + 6, { width: colunas[1].largura - 12, align: "center" });
    doc.text(brl(item.preco), xs[2] + 6, y + 6, { width: colunas[2].largura - 12, align: "right" });
    doc.text(brl(item.preco * item.quantidade), xs[3] + 6, y + 6, { width: colunas[3].largura - 12, align: "right" });
    doc.moveTo(M, y + altura).lineTo(M + largura, y + altura).strokeColor(COR.borda).lineWidth(0.5).stroke();
    doc.y = y + altura;
  });
  doc.moveDown(0.8);

  if (p.observacoesCliente) {
    caixa("Observações do cliente", [p.observacoesCliente]);
  }

  /* Totais — label e valor desenhados como duas colunas de posicao fixa (M e
     xValor), nao com `continued: true`: no pdfkit o texto encadeado retoma da
     posicao onde o glyph anterior terminou, entao linhas com labels de
     tamanhos diferentes (ex. "Subtotal" vs. "Cashback para o cliente") saiam
     com a coluna de valor desalinhada em vez de ficar reta a direita. */
  garantirEspaco(140);
  const larguraValor = 150;
  const xValor = M + largura - larguraValor;
  const linhaTotal = (label: string, valor: string, destaque = false) => {
    const y = doc.y;
    doc
      .font(destaque ? "Helvetica-Bold" : "Helvetica")
      .fontSize(destaque ? 14 : 10.5)
      .fillColor(destaque ? COR.texto : COR.suave)
      .text(label, M, y, { width: largura - larguraValor });
    doc.text(valor, xValor, y, { width: larguraValor, align: "right" });
    doc.y = y;
    doc.moveDown(destaque ? 1.1 : 1.25);
  };
  doc.x = M;
  linhaTotal("Subtotal", brl(p.subtotal));
  if (p.cashbackValor > 0) linhaTotal("Cashback para o cliente", brl(p.cashbackValor));
  if (p.desconto > 0) linhaTotal("Desconto", `-${brl(p.desconto)}`);
  if (p.taxaEntrega > 0) linhaTotal("Taxa de entrega", brl(p.taxaEntrega));
  if (p.taxaMaquininha > 0) linhaTotal("Taxa maquininha", brl(p.taxaMaquininha));
  if (p.cashbackUsado > 0) linhaTotal("Cashback usado", `-${brl(p.cashbackUsado)}`);
  doc.moveTo(M, doc.y + 2).lineTo(M + largura, doc.y + 2).strokeColor(COR.borda).lineWidth(0.5).stroke();
  doc.moveDown(0.4);
  linhaTotal("Total", brl(p.total), true);

  /* Pagamento */
  doc.moveDown(0.6);
  garantirEspaco(50);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COR.suave).text("PAGAMENTO", M, doc.y);
  doc.moveDown(0.3);
  if (dados.pagamentos.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(COR.claro).text("Não informado", M, doc.y);
  } else {
    dados.pagamentos.forEach((pg) => {
      const y = doc.y;
      doc
        .font("Helvetica")
        .fontSize(10.5)
        .fillColor(COR.texto)
        .text(PAGAMENTO_LABELS[pg.forma] ?? pg.forma, M, y, { width: largura - larguraValor });
      doc.text(brl(pg.valor), xValor, y, { width: larguraValor, align: "right" });
      doc.y = y;
      doc.moveDown(1.2);
    });
  }

  doc.end();
  return fim;
}
