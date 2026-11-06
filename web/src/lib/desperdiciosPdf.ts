import "server-only";
import PDFDocument from "pdfkit";
import { MOTIVOS, MOTIVO_LABEL, ORIGEM_LABEL, TIPOS, TIPO_LABEL, filtrosLabel, periodoLabel, type Desperdicio, type FiltrosDesperdicio } from "@/lib/desperdicios";

/* PDF do controle de desperdicio (/desperdicios), no mesmo estilo visual do financeiroDashboardPdf.ts. */

export type DadosPdfDesperdicio = {
  loja: { nome: string; logoUrl: string };
  filtros: FiltrosDesperdicio;
  itens: Desperdicio[];
};

const COR = { texto: "#0f172a", suave: "#64748b", borda: "#e2e8f0", fundo: "#f8fafc", claro: "#94a3b8", marca: "#9c5523", marcaClara: "#fbf0e7", negativo: "#dc2626" };
const M = 40;

function brl(n: number): string {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function qtd(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function pct(n: number): string {
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function dataBr(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
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

export async function gerarPdfDesperdicio(dados: DadosPdfDesperdicio): Promise<Buffer> {
  const logo = await baixarImagem(dados.loja.logoUrl);
  const { itens, filtros } = dados;

  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: "Controle de Desperdício" } });
  const partes: Buffer[] = [];
  doc.on("data", (c: Buffer) => partes.push(c));
  const fim = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(partes))));

  const largura = doc.page.width - M * 2;
  const rodapeY = () => doc.page.height - M;
  const garantirEspaco = (altura: number) => {
    if (doc.y + altura > rodapeY()) doc.addPage();
  };

  /* Cabecalho */
  const yTopo = doc.y;
  if (logo) {
    try {
      doc.image(logo, M, yTopo, { fit: [44, 44] });
    } catch {
      /* segue sem logo */
    }
  }
  const xTexto = logo ? M + 56 : M;
  doc.fillColor(COR.texto).font("Helvetica-Bold").fontSize(18).text("Controle de Desperdício", xTexto, yTopo, { width: largura - (xTexto - M) });
  doc.font("Helvetica").fontSize(11).fillColor(COR.suave).text(dados.loja.nome, xTexto, doc.y + 2, { width: largura - (xTexto - M) });
  doc.y = Math.max(doc.y, yTopo + 44) + 10;

  /* Faixa com periodo + filtros aplicados */
  const filtrosTexto = filtrosLabel(filtros).slice(1).join("   •   ") || "Sem filtros adicionais";
  doc.font("Helvetica").fontSize(9);
  const alturaFiltros = doc.heightOfString(`Filtros: ${filtrosTexto}`, { width: largura - 24 });
  const alturaFaixa = 26 + alturaFiltros + 4;
  doc.rect(M, doc.y, largura, alturaFaixa).fill(COR.marcaClara);
  const yFaixa = doc.y + 8;
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COR.marca);
  doc.text(`PERÍODO: ${periodoLabel(filtros.de, filtros.ate)}`, M + 12, yFaixa, { continued: true, width: largura - 24 });
  doc.font("Helvetica").fillColor(COR.suave).text(`   •   Emitido em ${dataHoraFortaleza()}`);
  doc.font("Helvetica").fontSize(9).fillColor(COR.suave).text(`Filtros: ${filtrosTexto}`, M + 12, yFaixa + 15, { width: largura - 24 });
  doc.y = yFaixa - 8 + alturaFaixa + 12;

  /* KPIs */
  const total = itens.reduce((s, i) => s + i.total, 0);
  const quantidade = itens.reduce((s, i) => s + i.quantidade, 0);
  const kpis = [
    { label: "Total perdido", valor: brl(total), cor: COR.negativo },
    { label: "Quantidade perdida", valor: qtd(quantidade) },
    { label: "Lançamentos", valor: String(itens.length) },
    { label: "Média por lançamento", valor: brl(itens.length ? total / itens.length : 0) },
  ];
  const gap = 8;
  const larguraCaixa = (largura - gap * 3) / 4;
  const alturaCaixa = 46;
  const yKpi = doc.y;
  kpis.forEach((k, i) => {
    const x = M + i * (larguraCaixa + gap);
    doc.roundedRect(x, yKpi, larguraCaixa, alturaCaixa, 6).fillAndStroke(COR.fundo, COR.borda);
    doc.font("Helvetica").fontSize(8).fillColor(COR.suave).text(k.label.toUpperCase(), x + 10, yKpi + 9, { width: larguraCaixa - 20, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(12.5).fillColor(k.cor ?? COR.texto).text(k.valor, x + 10, yKpi + 22, { width: larguraCaixa - 20, lineBreak: false });
  });
  doc.y = yKpi + alturaCaixa + 16;
  doc.x = M;

  type Coluna = { titulo: string; largura: number; alinhar: "left" | "center" | "right" };
  const tabela = (titulo: string, colunasDef: Coluna[], linhas: string[][], rodape?: string[]) => {
    garantirEspaco(50);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(COR.texto).text(titulo, M, doc.y);
    doc.moveDown(0.35);
    if (linhas.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor(COR.claro).text("Sem lançamentos com esses filtros.", M, doc.y);
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
      doc.font("Helvetica-Bold").fontSize(8).fillColor(COR.suave);
      colunasDef.forEach((c, i) => doc.text(c.titulo.toUpperCase(), xs[i] + 5, yc, { width: c.largura - 10, align: c.alinhar }));
      doc.y += 20;
    };
    cabecalho();
    const desenharLinha = (linha: string[], li: number, negrito = false) => {
      doc.font(negrito ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      const altura = Math.max(...linha.map((t, i) => doc.heightOfString(t, { width: colunasDef[i].largura - 10 }))) + 11;
      if (doc.y + altura > rodapeY()) {
        doc.addPage();
        cabecalho();
      }
      const y = doc.y;
      if (negrito) doc.rect(M, y, largura, altura).fill(COR.marcaClara);
      else if (li % 2 === 1) doc.rect(M, y, largura, altura).fill(COR.fundo);
      linha.forEach((t, i) =>
        doc
          .fillColor(negrito ? COR.marca : COR.texto)
          .font(negrito ? "Helvetica-Bold" : "Helvetica")
          .fontSize(9)
          .text(t, xs[i] + 5, y + 5.5, { width: colunasDef[i].largura - 10, align: colunasDef[i].alinhar })
      );
      doc.y = y + altura;
    };
    linhas.forEach((l, li) => desenharLinha(l, li));
    if (rodape) desenharLinha(rodape, 0, true);
    doc.moveTo(M, doc.y).lineTo(M + largura, doc.y).strokeColor(COR.borda).lineWidth(0.5).stroke();
    doc.moveDown(0.9);
  };

  const agrupar = <T extends string>(lista: { id: T; label: string }[], chave: (d: Desperdicio) => T) =>
    lista
      .map((g) => {
        const doGrupo = itens.filter((d) => chave(d) === g.id);
        return { label: g.label, quantidade: doGrupo.reduce((s, d) => s + d.quantidade, 0), total: doGrupo.reduce((s, d) => s + d.total, 0) };
      })
      .filter((g) => g.total > 0 || g.quantidade > 0)
      .sort((a, b) => b.total - a.total);

  const colunasResumo = (rotulo: string): Coluna[] => [
    { titulo: rotulo, largura: largura - 270, alinhar: "left" },
    { titulo: "Quantidade", largura: 90, alinhar: "right" },
    { titulo: "% do total", largura: 80, alinhar: "right" },
    { titulo: "Total", largura: 100, alinhar: "right" },
  ];
  const linhasResumo = (grupos: { label: string; quantidade: number; total: number }[]) =>
    grupos.map((g) => [g.label, qtd(g.quantidade), pct(total > 0 ? (g.total / total) * 100 : 0), brl(g.total)]);

  tabela("Perdas por tipo", colunasResumo("Tipo"), linhasResumo(agrupar(TIPOS, (d) => d.tipo)));
  tabela("Perdas por motivo", colunasResumo("Motivo"), linhasResumo(agrupar(MOTIVOS, (d) => d.motivo)));

  /* Top itens */
  const porItem = new Map<string, { descricao: string; quantidade: number; total: number }>();
  for (const d of itens) {
    const chave = d.produtoId ? `p${d.produtoId}` : `a${d.descricao.trim().toLowerCase()}`;
    const atual = porItem.get(chave) ?? { descricao: d.descricao, quantidade: 0, total: 0 };
    atual.quantidade += d.quantidade;
    atual.total += d.total;
    porItem.set(chave, atual);
  }
  const top = [...porItem.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  tabela("Itens com mais perda", colunasResumo("Item"), top.map((t) => [t.descricao, qtd(t.quantidade), pct(total > 0 ? (t.total / total) * 100 : 0), brl(t.total)]));

  /* Detalhamento */
  tabela(
    "Lançamentos",
    [
      { titulo: "Data", largura: 52, alinhar: "left" },
      { titulo: "Item", largura: largura - 52 - 78 - 72 - 46 - 58 - 62, alinhar: "left" },
      { titulo: "Tipo", largura: 78, alinhar: "left" },
      { titulo: "Motivo", largura: 72, alinhar: "left" },
      { titulo: "Qtd", largura: 46, alinhar: "right" },
      { titulo: "Custo un.", largura: 58, alinhar: "right" },
      { titulo: "Total", largura: 62, alinhar: "right" },
    ],
    itens.map((d) => [
      dataBr(d.data),
      `${d.descricao}${d.origem === "avulsa" ? ` (${ORIGEM_LABEL.avulsa.toLowerCase()})` : ""}${d.observacao ? `\n${d.observacao}` : ""}`,
      TIPO_LABEL[d.tipo],
      MOTIVO_LABEL[d.motivo],
      qtd(d.quantidade),
      brl(d.custoUnitario),
      brl(d.total),
    ]),
    ["", "Total geral", "", "", qtd(quantidade), "", brl(total)]
  );

  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(8).fillColor(COR.claro).text(`Página ${i + 1} de ${paginas.count}`, M, doc.page.height - 26, { width: largura, align: "center", lineBreak: false });
  }

  doc.end();
  return fim;
}
