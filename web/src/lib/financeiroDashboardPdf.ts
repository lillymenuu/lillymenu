import "server-only";
import PDFDocument from "pdfkit";
import { MESES_LABEL } from "@/lib/financeiroDashboard";
import type { FinanceiroDashboardResposta } from "@/lib/financeiroDashboard";

/* PDF detalhado do dashboard financeiro (/financialdashboard), no mesmo
   estilo visual do vendasPdf.ts (cores, margem e helpers de tabela/caixa). */

export type DadosPdfFinanceiro = {
  loja: { nome: string; logoUrl: string };
  dados: FinanceiroDashboardResposta;
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

function brl(v: number | string): string {
  const n = typeof v === "number" ? v : parseFloat(v) || 0;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(v: number | string): string {
  const n = typeof v === "number" ? v : parseFloat(v) || 0;
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
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

export async function gerarPdfFinanceiro(dados: DadosPdfFinanceiro): Promise<Buffer> {
  const logo = await baixarImagem(dados.loja.logoUrl);
  const { resumo_mensal: resumo, dashboard, dre } = dados.dados;
  const periodoLabel = `${MESES_LABEL[dados.dados.mes] ?? dados.dados.mes} de ${dados.dados.ano}`;

  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: "Dashboard Financeiro" } });
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
  doc.fillColor(COR.texto).font("Helvetica-Bold").fontSize(18).text("Dashboard Financeiro", xTexto, yTopo, { width: largura - (xTexto - M) });
  doc.font("Helvetica").fontSize(11).fillColor(COR.suave).text(dados.loja.nome, xTexto, doc.y + 2, { width: largura - (xTexto - M) });
  doc.y = Math.max(doc.y, yTopo + 44) + 10;

  /* Faixa com periodo/emissao */
  garantirEspaco(30);
  doc.rect(M, doc.y, largura, 26).fill(COR.marcaClara);
  const yFaixa = doc.y + 8;
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COR.marca);
  doc.text(`PERÍODO: ${periodoLabel}`, M + 12, yFaixa, { continued: true, width: largura - 24 });
  doc.font("Helvetica").fillColor(COR.suave).text(`   •   Emitido em ${dataHoraFortaleza()}`);
  doc.y = yFaixa + 22;
  doc.moveDown(0.6);

  /* KPIs em grade de caixinhas */
  const kpis: { label: string; valor: string; cor?: string }[] = [
    { label: "Receita", valor: brl(resumo.total_income), cor: COR.positivo },
    { label: "Despesa", valor: brl(resumo.total_expense), cor: COR.negativo },
    { label: "Lucro / Prejuízo", valor: brl(resumo.profit_or_loss), cor: resumo.profit_or_loss >= 0 ? COR.positivo : COR.negativo },
    { label: "Margem", valor: pct(resumo.margin_percent) },
  ];
  const colunas = 4;
  const gap = 8;
  const larguraCaixa = (largura - gap * (colunas - 1)) / colunas;
  const alturaCaixa = 46;
  garantirEspaco(alturaCaixa);
  const yInicioKpi = doc.y;
  kpis.forEach((k, i) => {
    const x = M + i * (larguraCaixa + gap);
    doc.roundedRect(x, yInicioKpi, larguraCaixa, alturaCaixa, 6).fillAndStroke(COR.fundo, COR.borda);
    doc.font("Helvetica").fontSize(8).fillColor(COR.suave).text(k.label.toUpperCase(), x + 10, yInicioKpi + 9, { width: larguraCaixa - 20, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(12.5).fillColor(k.cor ?? COR.texto).text(k.valor, x + 10, yInicioKpi + 22, { width: larguraCaixa - 20, lineBreak: false });
  });
  doc.y = yInicioKpi + alturaCaixa + 14;
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

  /* Fluxo de caixa: receitas por forma + despesas, com percentual do total */
  const totalIncome = Number(resumo.total_income) || 0;
  const totalExpense = Number(resumo.total_expense) || 0;
  const saldo = totalIncome - totalExpense;
  const grandPie = totalIncome + totalExpense;

  garantirEspaco(50);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(COR.texto).text("Fluxo de caixa", M, doc.y);
  doc.moveDown(0.35);
  const yResumoFluxo = doc.y;
  const larguraResumo = (largura - gap * 2) / 3;
  const resumoFluxo: { label: string; valor: string; cor: string }[] = [
    { label: "Receitas", valor: brl(totalIncome), cor: COR.positivo },
    { label: "Despesas", valor: brl(totalExpense), cor: COR.negativo },
    { label: "Saldo", valor: brl(saldo), cor: saldo >= 0 ? COR.positivo : COR.negativo },
  ];
  resumoFluxo.forEach((r, i) => {
    const x = M + i * (larguraResumo + gap);
    doc.roundedRect(x, yResumoFluxo, larguraResumo, 40, 6).fillAndStroke(COR.fundo, COR.borda);
    doc.font("Helvetica").fontSize(8).fillColor(COR.suave).text(r.label.toUpperCase(), x + 10, yResumoFluxo + 8, { width: larguraResumo - 20, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(11.5).fillColor(r.cor).text(r.valor, x + 10, yResumoFluxo + 20, { width: larguraResumo - 20, lineBreak: false });
  });
  doc.y = yResumoFluxo + 40 + 14;
  doc.x = M;

  const fatiasFluxo = [
    ...dashboard.income_by_payment_method.map((p) => ({ label: PAGAMENTO_LABELS[p.payment_method] ?? p.payment_method, valor: Number(p.total) || 0 })),
    ...(totalExpense > 0 ? [{ label: "Despesas", valor: totalExpense }] : []),
  ];
  tabela(
    "Composição da movimentação",
    [
      { titulo: "Origem", largura: largura - 240, alinhar: "left" },
      { titulo: "% do total", largura: 120, alinhar: "right" },
      { titulo: "Valor", largura: 120, alinhar: "right" },
    ],
    fatiasFluxo.map((f) => [f.label, grandPie > 0 ? pct((f.valor / grandPie) * 100) : "0,00%", brl(f.valor)])
  );

  tabela(
    "Receitas por forma de pagamento",
    [
      { titulo: "Forma de pagamento", largura: largura - 120, alinhar: "left" },
      { titulo: "Total", largura: 120, alinhar: "right" },
    ],
    dashboard.income_by_payment_method.map((p) => [PAGAMENTO_LABELS[p.payment_method] ?? p.payment_method, brl(p.total)])
  );

  tabela(
    "Despesas por categoria",
    [
      { titulo: "Categoria", largura: largura - 240, alinhar: "left" },
      { titulo: "Grupo", largura: 120, alinhar: "left" },
      { titulo: "Total", largura: 120, alinhar: "right" },
    ],
    dashboard.expense_by_category.map((c) => [c.category_name, c.category_group ?? "-", brl(c.total)])
  );

  tabela(
    "Contas financeiras",
    [
      { titulo: "Conta", largura: largura - 330, alinhar: "left" },
      { titulo: "Receita", largura: 110, alinhar: "right" },
      { titulo: "Despesa", largura: 110, alinhar: "right" },
      { titulo: "Saldo", largura: 110, alinhar: "right" },
    ],
    dashboard.accounts.map((c) => [c.name, brl(c.monthly_income), brl(c.monthly_expense), brl(c.monthly_balance)])
  );

  /* DRE do mes */
  garantirEspaco(50);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(COR.texto).text("DRE do mês", M, doc.y);
  doc.moveDown(0.35);
  const yDre = doc.y;
  const dreKpis: { label: string; valor: string; cor?: string }[] = [
    { label: "Receita bruta", valor: brl(dre.gross_revenue) },
    { label: "Despesas totais", valor: brl(dre.total_expenses) },
    { label: "Lucro líquido", valor: brl(dre.net_profit), cor: dre.net_profit >= 0 ? COR.positivo : COR.negativo },
    { label: "Margem", valor: pct(dre.margin_percent) },
  ];
  dreKpis.forEach((k, i) => {
    const x = M + i * (larguraCaixa + gap);
    doc.roundedRect(x, yDre, larguraCaixa, alturaCaixa, 6).fillAndStroke(COR.fundo, COR.borda);
    doc.font("Helvetica").fontSize(8).fillColor(COR.suave).text(k.label.toUpperCase(), x + 10, yDre + 9, { width: larguraCaixa - 20, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(12.5).fillColor(k.cor ?? COR.texto).text(k.valor, x + 10, yDre + 22, { width: larguraCaixa - 20, lineBreak: false });
  });
  doc.y = yDre + alturaCaixa + 14;
  doc.x = M;

  const TIPO_DRE_LABELS: Record<string, string> = { income: "Receita", expense: "Despesa" };
  tabela(
    "Detalhamento do DRE por categoria",
    [
      { titulo: "Tipo", largura: 90, alinhar: "left" },
      { titulo: "Categoria", largura: largura - 90 - 150 - 120, alinhar: "left" },
      { titulo: "Grupo", largura: 150, alinhar: "left" },
      { titulo: "Total", largura: 120, alinhar: "right" },
    ],
    dre.lines.map((l) => [TIPO_DRE_LABELS[l.type] ?? l.type, l.category_name, l.group_name, brl(l.total)])
  );

  /* Numeracao de pagina no rodape. */
  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(8).fillColor(COR.claro).text(`Página ${i + 1} de ${paginas.count}`, M, doc.page.height - 26, { width: largura, align: "center", lineBreak: false });
  }

  doc.end();
  return fim;
}
