import "server-only";
import ExcelJS from "exceljs";
import { STATUS_LABELS, TIPO_LABELS } from "@/components/ordermanager/constants";
import type { RelatorioVendasResultado } from "@/db/queries/relatoriosVendas";

/* Planilha elegante do relatorio de vendas (/sales): aba "Resumo" com os
   indicadores e rankings do periodo, aba "Pedidos" com a lista completa. */

export type DadosExcelVendas = {
  loja: { nome: string };
  periodoLabel: string;
  tipoLabel: string;
  relatorio: RelatorioVendasResultado;
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

const fmtBRL = "#,##0.00";
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

function linhaTabela(ws: ExcelJS.Worksheet, linha: number, valores: (string | number)[], indice: number, moedaCols: number[] = []) {
  valores.forEach((v, i) => {
    const cel = ws.getCell(linha, i + 1);
    cel.value = v;
    cel.border = bordaFina;
    cel.font = { size: 10 };
    if (indice % 2 === 1) cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${CINZA_CLARO}` } };
    if (moedaCols.includes(i)) cel.numFmt = fmtBRL;
  });
}

export async function gerarExcelVendas(dados: DadosExcelVendas): Promise<Buffer> {
  const { relatorio: r } = dados;
  const wb = new ExcelJS.Workbook();
  wb.creator = "LillyMenu";
  wb.created = new Date();

  /* ---------- Aba Resumo ---------- */
  const resumo = wb.addWorksheet("Resumo", { views: [{ showGridLines: false }] });
  resumo.columns = [{ width: 36 }, { width: 18 }, { width: 18 }];

  resumo.mergeCells("A1:C1");
  const tituloCel = resumo.getCell("A1");
  tituloCel.value = "Relatório de Vendas";
  tituloCel.font = { bold: true, size: 18, color: { argb: `FF${MARCA}` } };
  resumo.getRow(1).height = 28;

  resumo.mergeCells("A2:C2");
  resumo.getCell("A2").value = dados.loja.nome;
  resumo.getCell("A2").font = { size: 11, color: { argb: "FF64748B" } };

  resumo.mergeCells("A3:C3");
  resumo.getCell("A3").value = `Período: ${dados.periodoLabel}   •   Tipo: ${dados.tipoLabel}   •   Emitido em ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" }).format(new Date())}`;
  resumo.getCell("A3").font = { size: 9.5, italic: true, color: { argb: "FF94A3B8" } };

  let lin = 5;
  const kpis: { label: string; valor: number; moeda: boolean; cor?: string }[] = [
    { label: "Faturamento", valor: r.resumo.faturamento, moeda: true, cor: POSITIVO },
    { label: "Ticket médio", valor: r.resumo.ticketMedio, moeda: true },
    { label: "Pedidos", valor: r.resumo.totalPedidos, moeda: false },
    { label: "Taxas de entrega", valor: r.resumo.taxaEntrega, moeda: true },
    { label: "Cancelados", valor: r.cancelados, moeda: false, cor: r.cancelados > 0 ? NEGATIVO : undefined },
    { label: "Valor cancelado", valor: r.canceladosValor, moeda: true, cor: r.canceladosValor > 0 ? NEGATIVO : undefined },
    { label: "Fiado recebido", valor: r.fiadoRecebido, moeda: true },
  ];
  lin = tituloSecao(resumo, lin, "Indicadores do período", 3);
  kpis.forEach((k) => {
    resumo.getCell(lin, 1).value = k.label;
    resumo.getCell(lin, 1).font = { size: 10, color: { argb: "FF64748B" } };
    resumo.getCell(lin, 1).border = bordaFina;
    const celValor = resumo.getCell(lin, 2);
    celValor.value = k.valor;
    if (k.moeda) celValor.numFmt = fmtBRL;
    celValor.font = { bold: true, size: 10.5, color: { argb: `FF${k.cor ?? "0F172A"}` } };
    celValor.border = bordaFina;
    lin++;
  });

  lin += 1;
  lin = tituloSecao(resumo, lin, "Vendas por forma de pagamento", 3);
  lin = cabecalhoTabela(resumo, lin, ["Forma de pagamento", "Quantidade", "Total"]);
  r.vendasPagamento.forEach((v, i) => {
    linhaTabela(resumo, lin, [PAGAMENTO_LABELS[v.forma] ?? v.forma, v.quantidade, v.total], i, [2]);
    lin++;
  });

  lin += 1;
  lin = tituloSecao(resumo, lin, "Produtos mais vendidos", 3);
  lin = cabecalhoTabela(resumo, lin, ["Produto", "Unidades", ""]);
  r.produtos.forEach((p, i) => {
    linhaTabela(resumo, lin, [p.nome, p.quantidade, ""], i);
    lin++;
  });

  lin += 1;
  lin = tituloSecao(resumo, lin, "Vendas por produto", 3);
  lin = cabecalhoTabela(resumo, lin, ["Produto", "Quantidade", "Total"]);
  r.vendasProdutos.forEach((p, i) => {
    linhaTabela(resumo, lin, [p.nome, p.quantidade, p.total], i, [2]);
    lin++;
  });

  lin += 1;
  lin = tituloSecao(resumo, lin, "Melhores clientes", 3);
  lin = cabecalhoTabela(resumo, lin, ["Cliente", "Pedidos", ""]);
  r.clientesFrequencia.forEach((c, i) => {
    linhaTabela(resumo, lin, [c.nome, c.pedidos, ""], i);
    lin++;
  });

  /* ---------- Aba Pedidos ---------- */
  const ws = wb.addWorksheet("Pedidos", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  ws.columns = [
    { header: "Nº Pedido", key: "codigo", width: 12 },
    { header: "Cliente", key: "cliente", width: 32 },
    { header: "Data", key: "data", width: 18 },
    { header: "Pagamento", key: "pagamento", width: 20 },
    { header: "Status", key: "status", width: 16 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Valor", key: "valor", width: 16 },
  ];
  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cel) => {
    cel.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${MARCA}` } };
    cel.alignment = { vertical: "middle" };
    cel.border = bordaFina;
  });
  ws.autoFilter = { from: "A1", to: "G1" };

  r.pedidos.forEach((p, i) => {
    const row = ws.addRow({
      codigo: `#${p.codigo}`,
      cliente: p.cliente,
      data: new Date(p.criadoEm.replace(" ", "T")).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      pagamento: p.formaPagamento ? (PAGAMENTO_LABELS[p.formaPagamento] ?? p.formaPagamento) : "-",
      status: STATUS_LABELS[p.status] ?? p.status,
      tipo: TIPO_LABELS[p.tipo] ?? p.tipo,
      valor: p.total,
    });
    row.eachCell((cel) => {
      cel.border = bordaFina;
      cel.font = { size: 10 };
      if (i % 2 === 1) cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${CINZA_CLARO}` } };
    });
    row.getCell("valor").numFmt = fmtBRL;
    row.getCell("valor").alignment = { horizontal: "right" };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
