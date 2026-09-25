import "server-only";
import PDFDocument from "pdfkit";

/*
 * Equivalente de admin/helpers/orcamento_pdf_render.php + orcamentos_pdf.php
 * (dompdf): PDF A4 de orcamento ou recibo, desenhado direto com pdfkit.
 */

export type DadosPdfOrcamento = {
  tipo: "orcamento" | "recibo";
  loja: { nome: string; contato: string; endereco: string; logoUrl: string; capaUrl: string };
  cliente: { nome: string; whatsapp: string; endereco: string; documentoLabel: string; documento: string };
  descontoTipo: string;
  descontoValor: number;
  itens: { nome: string; obs: string; qtd: number; preco: number }[];
};

const COR = { texto: "#0f172a", suave: "#64748b", borda: "#e2e8f0", fundo: "#f8fafc", claro: "#94a3b8" };
const M = 40;

function brl(v: number): string {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function baixarImagem(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const jpg = buf[0] === 0xff && buf[1] === 0xd8;
    const png = buf[0] === 0x89 && buf[1] === 0x50;
    return jpg || png ? buf : null; /* pdfkit so le JPEG/PNG (webp e ignorado) */
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

export async function gerarPdfOrcamento(dados: DadosPdfOrcamento): Promise<Buffer> {
  const [logo, capa] = await Promise.all([baixarImagem(dados.loja.logoUrl), dados.tipo === "orcamento" ? baixarImagem(dados.loja.capaUrl) : Promise.resolve(null)]);
  const recibo = dados.tipo === "recibo";
  const titulo = recibo ? "Recibo" : "Orçamento";

  const doc = new PDFDocument({ size: "A4", margin: M, info: { Title: titulo } });
  const partes: Buffer[] = [];
  doc.on("data", (c: Buffer) => partes.push(c));
  const fim = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(partes))));

  const largura = doc.page.width - M * 2;
  const rodapeY = () => doc.page.height - M;

  const garantirEspaco = (altura: number) => {
    if (doc.y + altura > rodapeY()) doc.addPage();
  };

  const subtotal = dados.itens.filter((i) => i.qtd > 0).reduce((s, i) => s + i.preco * i.qtd, 0);
  const desconto = dados.descontoValor > 0 ? (dados.descontoTipo === "percent" ? subtotal * (dados.descontoValor / 100) : dados.descontoValor) : 0;
  const total = Math.max(0, subtotal - desconto);
  const descontoTexto = dados.descontoTipo === "percent" ? `${dados.descontoValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%` : brl(dados.descontoValor);

  /* capa / logo */
  if (capa) {
    try {
      doc.image(capa, M, doc.y, { width: largura, height: 140, fit: [largura, 140], align: "center", valign: "center" });
      if (logo) doc.image(logo, M + 16, doc.y + 110, { fit: [64, 64] });
      doc.y += 156;
    } catch {
      /* imagem invalida: segue sem capa */
    }
  } else if (logo) {
    try {
      doc.image(logo, M, doc.y, { fit: [recibo ? 54 : 64, recibo ? 54 : 64] });
      doc.y += recibo ? 62 : 72;
    } catch {
      /* segue sem logo */
    }
  }

  doc.fillColor(COR.texto);
  if (!recibo) doc.font("Helvetica-Bold").fontSize(18).text(titulo, M, doc.y, { width: largura });
  doc.font("Helvetica").fontSize(recibo ? 11 : 12).fillColor(COR.suave).text(`Emitido em ${dataHoraFortaleza()}`, M, doc.y + 2, { width: largura, align: recibo ? "center" : "left" });
  doc.moveDown(0.8);

  const caixa = (linhas: string[], negritoPrimeira: boolean) => {
    doc.fontSize(11);
    const altura = linhas.reduce((h, l, i) => h + doc.font(i === 0 && negritoPrimeira ? "Helvetica-Bold" : "Helvetica").heightOfString(l || " ", { width: largura - 20 }) + 2, 20);
    garantirEspaco(altura);
    const y = doc.y;
    doc.roundedRect(M, y, largura, altura, 8).strokeColor(COR.borda).lineWidth(1).stroke();
    doc.y = y + 10;
    linhas.forEach((l, i) => {
      doc.font(i === 0 && negritoPrimeira ? "Helvetica-Bold" : "Helvetica").fillColor(COR.texto).text(l || " ", M + 10, doc.y, { width: largura - 20 });
      doc.y += 2;
    });
    doc.y = y + altura + 12;
  };

  caixa([recibo ? dados.loja.nome : "Loja", ...(recibo ? [] : [dados.loja.nome]), dados.loja.contato, dados.loja.endereco], true);

  const tabela = (colunas: { titulo: string; largura: number; alinhar: "left" | "center" | "right" }[], linhas: string[][]) => {
    const xs: number[] = [];
    let x = M;
    for (const c of colunas) {
      xs.push(x);
      x += c.largura;
    }
    const cabecalho = () => {
      doc.rect(M, doc.y, largura, 22).fill(COR.fundo);
      const yc = doc.y + 7;
      doc.font("Helvetica-Bold").fontSize(9).fillColor(COR.suave);
      colunas.forEach((c, i) => doc.text(c.titulo.toUpperCase(), xs[i] + 6, yc, { width: c.largura - 12, align: c.alinhar }));
      doc.y += 22;
    };
    garantirEspaco(60);
    cabecalho();
    doc.font("Helvetica").fontSize(11);
    for (const linha of linhas) {
      const altura = Math.max(...linha.map((t, i) => doc.heightOfString(t, { width: colunas[i].largura - 12 }))) + 14;
      if (doc.y + altura > rodapeY()) {
        doc.addPage();
        cabecalho();
        doc.font("Helvetica").fontSize(11);
      }
      const y = doc.y;
      linha.forEach((t, i) => doc.fillColor(COR.texto).text(t, xs[i] + 6, y + 7, { width: colunas[i].largura - 12, align: colunas[i].alinhar }));
      doc.moveTo(M, y + altura).lineTo(M + largura, y + altura).strokeColor(COR.borda).lineWidth(0.5).stroke();
      doc.y = y + altura;
    }
  };

  const linhasItens = dados.itens.filter((i) => i.qtd > 0).map((i) => [i.obs.trim() ? `${i.nome}\n${i.obs.trim()}` : i.nome, String(i.qtd), brl(i.preco), brl(i.preco * i.qtd)]);
  const colunasItens = [
    { titulo: recibo ? "Descrição" : "Produto", largura: largura - 250, alinhar: "left" as const },
    { titulo: "Qtd", largura: 50, alinhar: "center" as const },
    { titulo: "Valor", largura: 100, alinhar: "right" as const },
    { titulo: "Subtotal", largura: 100, alinhar: "right" as const },
  ];

  if (!recibo) {
    caixa(["Cliente", dados.cliente.nome, ...(dados.cliente.documento ? [`${dados.cliente.documentoLabel}: ${dados.cliente.documento}`] : []), dados.cliente.whatsapp, dados.cliente.endereco], true);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COR.texto).text(`Itens do ${titulo}`, M, doc.y);
    doc.moveDown(0.4);
  } else {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COR.suave).text("COMPROVANTE DE ATENDIMENTO", M, doc.y);
    doc.font("Helvetica-Bold").fontSize(16).fillColor(COR.texto).text(dados.cliente.nome, M, doc.y + 2);
    doc.moveDown(0.5);
    caixa([...(dados.cliente.documento ? [`${dados.cliente.documentoLabel}: ${dados.cliente.documento}`] : []), `WhatsApp: ${dados.cliente.whatsapp}`, `Endereço: ${dados.cliente.endereco}`], false);
  }

  tabela(colunasItens, linhasItens);

  doc.moveDown(0.8);
  garantirEspaco(90);
  if (desconto > 0) doc.font("Helvetica").fontSize(11).fillColor(COR.suave).text(`Desconto: ${descontoTexto}`, M, doc.y, { width: largura, align: "right" });
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(recibo ? 15 : 14).fillColor(COR.texto).text(`${recibo ? "Total recebido" : "Total"}: ${brl(total)}`, M, doc.y, { width: largura, align: "right" });

  /* assinaturas */
  garantirEspaco(110);
  doc.moveDown(2);
  doc.font("Helvetica").fontSize(10).fillColor(COR.suave).text("Data da assinatura: ____/____/________", M, doc.y);
  doc.moveDown(3);
  const ya = doc.y;
  const meio = largura / 2;
  [0, 1].forEach((i) => {
    const x0 = M + i * meio + 20;
    doc.moveTo(x0, ya).lineTo(x0 + meio - 40, ya).strokeColor(COR.texto).lineWidth(0.8).stroke();
    doc.font("Helvetica").fontSize(9.5).fillColor(COR.suave).text(i === 0 ? "Assinatura do responsável" : "Assinatura do cliente", x0, ya + 6, { width: meio - 40, align: "center" });
  });

  doc.end();
  return fim;
}
