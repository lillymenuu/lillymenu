import "server-only";
import ExcelJS from "exceljs";
import { MESES_LABEL } from "@/lib/financeiroDashboard";
import type { FinanceiroDashboardResposta } from "@/lib/financeiroDashboard";

/* Planilha elegante do dashboard financeiro (/financialdashboard), no mesmo
   estilo visual do vendasExcel.ts (cores, titulos de secao e tabelas). */

export type DadosExcelFinanceiro = {
  loja: { nome: string };
  dados: FinanceiroDashboardResposta;
};

const MARCA = "9C5523";
const MARCA_CLARA = "FBF0E7";
const CINZA_CLARO = "F8FAFC";
const BORDA = "E2E8F0";
const POSITIVO = "059669";
const NEGATIVO = "DC2626";

const PAGAMENTO_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  sem_pagamento: "Sem pagamento",
};

const TIPO_DRE_LABELS: Record<string, string> = { income: "Receita", expense: "Despesa" };

const fmtBRL = "#,##0.00";
const fmtPct = "#,##0.00\\%";
const borda = { style: "thin" as const, color: { argb: `FF${BORDA}` } };
const bordaFina = { top: borda, left: borda, bottom: borda, right: borda };

function tituloSecao(ws: ExcelJS.Worksheet, linha: number, texto: string, colunas: number) {
  ws.mergeCells(linha, 1, linha, colunas);
  const cel = ws.getCell(linha, 1);
  cel.value = texto;
  cel.font = { bold: true, size: 12, color: { argb: "FF0F172A" } };
  cel.alignment = { vertical: "middle" };
  ws.getRow(linha).height = 22;
  return linha + 1;
}

function cabecalhoTabela(ws: ExcelJS.Worksheet, linha: number, titulos: string[]) {
  titulos.forEach((t, i) => {
    const cel = ws.getCell(linha, i + 1);
    cel.value = t;
    cel.font = { bold: true, size: 9, color: { argb: `FF${MARCA}` } };
    cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${MARCA_CLARA}` } };
    cel.border = bordaFina;
    cel.alignment = { vertical: "middle" };
  });
  ws.getRow(linha).height = 18;
  return linha + 1;
}

function linhaTabela(ws: ExcelJS.Worksheet, linha: number, valores: (string | number)[], indice: number, moedaCols: number[] = [], pctCols: number[] = []) {
  valores.forEach((v, i) => {
    const cel = ws.getCell(linha, i + 1);
    cel.value = v;
    cel.border = bordaFina;
    cel.font = { size: 10 };
    if (indice % 2 === 1) cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${CINZA_CLARO}` } };
    if (moedaCols.includes(i)) cel.numFmt = fmtBRL;
    if (pctCols.includes(i)) cel.numFmt = fmtPct;
  });
}

function num(v: string | number): number {
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

export async function gerarExcelFinanceiro(dados: DadosExcelFinanceiro): Promise<Buffer> {
  const { resumo_mensal: resumo, dashboard, dre } = dados.dados;
  const periodoLabel = `${MESES_LABEL[dados.dados.mes] ?? dados.dados.mes} de ${dados.dados.ano}`;

  const totalIncome = num(resumo.total_income);
  const totalExpense = num(resumo.total_expense);
  const saldo = totalIncome - totalExpense;
  const grandPie = totalIncome + totalExpense;

  const wb = new ExcelJS.Workbook();
  wb.creator = "LillyMenu";
  wb.created = new Date();

  const ws = wb.addWorksheet("Dashboard financeiro", { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 36 }, { width: 18 }, { width: 18 }, { width: 18 }];

  ws.mergeCells("A1:D1");
  const tituloCel = ws.getCell("A1");
  tituloCel.value = "Dashboard Financeiro";
  tituloCel.font = { bold: true, size: 18, color: { argb: `FF${MARCA}` } };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = dados.loja.nome;
  ws.getCell("A2").font = { size: 11, color: { argb: "FF64748B" } };

  ws.mergeCells("A3:D3");
  ws.getCell("A3").value = `Período: ${periodoLabel}   •   Emitido em ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" }).format(new Date())}`;
  ws.getCell("A3").font = { size: 9.5, italic: true, color: { argb: "FF94A3B8" } };

  let lin = 5;

  /* ---------- Indicadores ---------- */
  lin = tituloSecao(ws, lin, "Indicadores do período", 4);
  const kpis: { label: string; valor: number; moeda?: boolean; pct?: boolean; cor?: string }[] = [
    { label: "Receita", valor: totalIncome, moeda: true, cor: POSITIVO },
    { label: "Despesa", valor: totalExpense, moeda: true, cor: NEGATIVO },
    { label: "Lucro / Prejuízo", valor: num(resumo.profit_or_loss), moeda: true, cor: num(resumo.profit_or_loss) >= 0 ? POSITIVO : NEGATIVO },
    { label: "Margem", valor: num(resumo.margin_percent), pct: true },
  ];
  kpis.forEach((k) => {
    ws.getCell(lin, 1).value = k.label;
    ws.getCell(lin, 1).font = { size: 10, color: { argb: "FF64748B" } };
    ws.getCell(lin, 1).border = bordaFina;
    const celValor = ws.getCell(lin, 2);
    celValor.value = k.valor;
    if (k.moeda) celValor.numFmt = fmtBRL;
    if (k.pct) celValor.numFmt = fmtPct;
    celValor.font = { bold: true, size: 10.5, color: { argb: `FF${k.cor ?? "0F172A"}` } };
    celValor.border = bordaFina;
    ws.mergeCells(lin, 2, lin, 4);
    lin++;
  });

  /* ---------- Fluxo de caixa ---------- */
  lin += 1;
  lin = tituloSecao(ws, lin, "Fluxo de caixa", 4);
  const resumoFluxo: { label: string; valor: number; cor: string }[] = [
    { label: "Receitas", valor: totalIncome, cor: POSITIVO },
    { label: "Despesas", valor: totalExpense, cor: NEGATIVO },
    { label: "Saldo", valor: saldo, cor: saldo >= 0 ? POSITIVO : NEGATIVO },
  ];
  resumoFluxo.forEach((r) => {
    ws.getCell(lin, 1).value = r.label;
    ws.getCell(lin, 1).font = { size: 10, color: { argb: "FF64748B" } };
    ws.getCell(lin, 1).border = bordaFina;
    const celValor = ws.getCell(lin, 2);
    celValor.value = r.valor;
    celValor.numFmt = fmtBRL;
    celValor.font = { bold: true, size: 10.5, color: { argb: `FF${r.cor}` } };
    celValor.border = bordaFina;
    ws.mergeCells(lin, 2, lin, 4);
    lin++;
  });

  lin += 1;
  lin = tituloSecao(ws, lin, "Composição da movimentação", 4);
  lin = cabecalhoTabela(ws, lin, ["Origem", "% do total", "Valor", ""]);
  const fatiasFluxo = [
    ...dashboard.income_by_payment_method.map((p) => ({ label: PAGAMENTO_LABELS[p.payment_method] ?? p.payment_method, valor: num(p.total) })),
    ...(totalExpense > 0 ? [{ label: "Despesas", valor: totalExpense }] : []),
  ];
  fatiasFluxo.forEach((f, i) => {
    linhaTabela(ws, lin, [f.label, grandPie > 0 ? Number(((f.valor / grandPie) * 100).toFixed(2)) : 0, f.valor, ""], i, [2], [1]);
    lin++;
  });

  /* ---------- Receitas por forma de pagamento ---------- */
  lin += 1;
  lin = tituloSecao(ws, lin, "Receitas por forma de pagamento", 4);
  lin = cabecalhoTabela(ws, lin, ["Forma de pagamento", "Total", "", ""]);
  dashboard.income_by_payment_method.forEach((p, i) => {
    linhaTabela(ws, lin, [PAGAMENTO_LABELS[p.payment_method] ?? p.payment_method, num(p.total), "", ""], i, [1]);
    lin++;
  });

  /* ---------- Despesas por categoria ---------- */
  lin += 1;
  lin = tituloSecao(ws, lin, "Despesas por categoria", 4);
  lin = cabecalhoTabela(ws, lin, ["Categoria", "Grupo", "Total", ""]);
  dashboard.expense_by_category.forEach((c, i) => {
    linhaTabela(ws, lin, [c.category_name, c.category_group ?? "-", num(c.total), ""], i, [2]);
    lin++;
  });

  /* ---------- Contas financeiras ---------- */
  lin += 1;
  lin = tituloSecao(ws, lin, "Contas financeiras", 4);
  lin = cabecalhoTabela(ws, lin, ["Conta", "Receita", "Despesa", "Saldo"]);
  dashboard.accounts.forEach((c, i) => {
    linhaTabela(ws, lin, [c.name, num(c.monthly_income), num(c.monthly_expense), num(c.monthly_balance)], i, [1, 2, 3]);
    lin++;
  });

  /* ---------- DRE do mes ---------- */
  lin += 1;
  lin = tituloSecao(ws, lin, "DRE do mês", 4);
  const dreKpis: { label: string; valor: number; moeda?: boolean; pct?: boolean; cor?: string }[] = [
    { label: "Receita bruta", valor: num(dre.gross_revenue), moeda: true },
    { label: "Despesas totais", valor: num(dre.total_expenses), moeda: true },
    { label: "Lucro líquido", valor: num(dre.net_profit), moeda: true, cor: num(dre.net_profit) >= 0 ? POSITIVO : NEGATIVO },
    { label: "Margem", valor: num(dre.margin_percent), pct: true },
  ];
  dreKpis.forEach((k) => {
    ws.getCell(lin, 1).value = k.label;
    ws.getCell(lin, 1).font = { size: 10, color: { argb: "FF64748B" } };
    ws.getCell(lin, 1).border = bordaFina;
    const celValor = ws.getCell(lin, 2);
    celValor.value = k.valor;
    if (k.moeda) celValor.numFmt = fmtBRL;
    if (k.pct) celValor.numFmt = fmtPct;
    celValor.font = { bold: true, size: 10.5, color: { argb: `FF${k.cor ?? "0F172A"}` } };
    celValor.border = bordaFina;
    ws.mergeCells(lin, 2, lin, 4);
    lin++;
  });

  lin += 1;
  lin = tituloSecao(ws, lin, "Detalhamento do DRE por categoria", 4);
  lin = cabecalhoTabela(ws, lin, ["Tipo", "Categoria", "Grupo", "Total"]);
  dre.lines.forEach((l, i) => {
    linhaTabela(ws, lin, [TIPO_DRE_LABELS[l.type] ?? l.type, l.category_name, l.group_name, num(l.total)], i, [3]);
    lin++;
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
