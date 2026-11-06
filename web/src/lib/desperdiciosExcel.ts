import "server-only";
import ExcelJS from "exceljs";
import { MOTIVOS, MOTIVO_LABEL, ORIGEM_LABEL, TIPOS, TIPO_LABEL, filtrosLabel, type Desperdicio, type FiltrosDesperdicio } from "@/lib/desperdicios";

/* Planilha do controle de desperdicio (/desperdicios), no mesmo estilo do financeiroDashboardExcel.ts:
   aba "Resumo" (filtros, indicadores e agrupamentos) e aba "Lançamentos" (uma linha por item). */

export type DadosExcelDesperdicio = {
  loja: { nome: string };
  filtros: FiltrosDesperdicio;
  itens: Desperdicio[];
};

const MARCA = "9C5523";
const MARCA_CLARA = "FBF0E7";
const CINZA_CLARO = "F8FAFC";
const BORDA = "E2E8F0";
const NEGATIVO = "DC2626";

const fmtBRL = "#,##0.00";
const fmtQtd = "#,##0.###";
const fmtPct = "#,##0.0\\%";
const borda = { style: "thin" as const, color: { argb: `FF${BORDA}` } };
const bordaFina = { top: borda, left: borda, bottom: borda, right: borda };

function tituloSecao(ws: ExcelJS.Worksheet, linha: number, texto: string, colunas: number) {
  ws.mergeCells(linha, 1, linha, colunas);
  const cel = ws.getCell(linha, 1);
  cel.value = texto;
  cel.font = { bold: true, size: 12, color: { argb: "FF0F172A" } };
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

function linhaTabela(ws: ExcelJS.Worksheet, linha: number, valores: (string | number)[], indice: number, formatos: Record<number, string> = {}, destaque = false) {
  valores.forEach((v, i) => {
    const cel = ws.getCell(linha, i + 1);
    cel.value = v;
    cel.border = bordaFina;
    cel.font = destaque ? { bold: true, size: 10, color: { argb: `FF${MARCA}` } } : { size: 10 };
    if (destaque) cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${MARCA_CLARA}` } };
    else if (indice % 2 === 1) cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${CINZA_CLARO}` } };
    if (formatos[i]) cel.numFmt = formatos[i];
  });
}

function cabecalhoPlanilha(ws: ExcelJS.Worksheet, colunas: number, titulo: string, dados: DadosExcelDesperdicio): number {
  ws.mergeCells(1, 1, 1, colunas);
  ws.getCell(1, 1).value = titulo;
  ws.getCell(1, 1).font = { bold: true, size: 18, color: { argb: `FF${MARCA}` } };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, colunas);
  ws.getCell(2, 1).value = dados.loja.nome;
  ws.getCell(2, 1).font = { size: 11, color: { argb: "FF64748B" } };

  ws.mergeCells(3, 1, 3, colunas);
  ws.getCell(3, 1).value = `${filtrosLabel(dados.filtros).join("   •   ")}   •   Emitido em ${new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date())}`;
  ws.getCell(3, 1).font = { size: 9.5, italic: true, color: { argb: "FF94A3B8" } };
  return 5;
}

export async function gerarExcelDesperdicio(dados: DadosExcelDesperdicio): Promise<Buffer> {
  const { itens } = dados;
  const total = itens.reduce((s, i) => s + i.total, 0);
  const quantidade = itens.reduce((s, i) => s + i.quantidade, 0);

  const wb = new ExcelJS.Workbook();
  wb.creator = "LillyMenu";
  wb.created = new Date();

  /* ---------- Resumo ---------- */
  const ws = wb.addWorksheet("Resumo", { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 38 }, { width: 16 }, { width: 14 }, { width: 18 }];
  let lin = cabecalhoPlanilha(ws, 4, "Controle de Desperdício", dados);

  lin = tituloSecao(ws, lin, "Indicadores do período", 4);
  const kpis: { label: string; valor: number; formato: string; cor?: string }[] = [
    { label: "Total perdido", valor: total, formato: fmtBRL, cor: NEGATIVO },
    { label: "Quantidade perdida", valor: quantidade, formato: fmtQtd },
    { label: "Lançamentos", valor: itens.length, formato: "0" },
    { label: "Média por lançamento", valor: itens.length ? total / itens.length : 0, formato: fmtBRL },
  ];
  for (const k of kpis) {
    ws.getCell(lin, 1).value = k.label;
    ws.getCell(lin, 1).font = { size: 10, color: { argb: "FF64748B" } };
    ws.getCell(lin, 1).border = bordaFina;
    const cel = ws.getCell(lin, 2);
    cel.value = k.valor;
    cel.numFmt = k.formato;
    cel.font = { bold: true, size: 10.5, color: { argb: `FF${k.cor ?? "0F172A"}` } };
    cel.border = bordaFina;
    ws.mergeCells(lin, 2, lin, 4);
    lin++;
  }

  const secaoAgrupada = (titulo: string, rotulo: string, grupos: { label: string; quantidade: number; total: number }[]) => {
    lin += 1;
    lin = tituloSecao(ws, lin, titulo, 4);
    lin = cabecalhoTabela(ws, lin, [rotulo, "Quantidade", "% do total", "Total"]);
    if (grupos.length === 0) {
      ws.getCell(lin, 1).value = "Sem lançamentos com esses filtros.";
      ws.getCell(lin, 1).font = { size: 10, italic: true, color: { argb: "FF94A3B8" } };
      lin++;
      return;
    }
    grupos.forEach((g, i) => {
      linhaTabela(ws, lin, [g.label, g.quantidade, total > 0 ? Number(((g.total / total) * 100).toFixed(1)) : 0, g.total], i, { 1: fmtQtd, 2: fmtPct, 3: fmtBRL });
      lin++;
    });
  };

  const agrupar = <T extends string>(lista: { id: T; label: string }[], chave: (d: Desperdicio) => T) =>
    lista
      .map((g) => {
        const doGrupo = itens.filter((d) => chave(d) === g.id);
        return { label: g.label, quantidade: doGrupo.reduce((s, d) => s + d.quantidade, 0), total: doGrupo.reduce((s, d) => s + d.total, 0) };
      })
      .filter((g) => g.total > 0 || g.quantidade > 0)
      .sort((a, b) => b.total - a.total);

  secaoAgrupada("Perdas por tipo", "Tipo", agrupar(TIPOS, (d) => d.tipo));
  secaoAgrupada("Perdas por motivo", "Motivo", agrupar(MOTIVOS, (d) => d.motivo));

  const porItem = new Map<string, { label: string; quantidade: number; total: number }>();
  for (const d of itens) {
    const chave = d.produtoId ? `p${d.produtoId}` : `a${d.descricao.trim().toLowerCase()}`;
    const atual = porItem.get(chave) ?? { label: d.descricao, quantidade: 0, total: 0 };
    atual.quantidade += d.quantidade;
    atual.total += d.total;
    porItem.set(chave, atual);
  }
  secaoAgrupada("Itens com mais perda", "Item", [...porItem.values()].sort((a, b) => b.total - a.total).slice(0, 10));

  /* ---------- Lancamentos ---------- */
  const wl = wb.addWorksheet("Lançamentos", { views: [{ showGridLines: false, state: "frozen", ySplit: 5 }] });
  wl.columns = [{ width: 12 }, { width: 38 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 11 }, { width: 13 }, { width: 14 }, { width: 34 }];
  let l = cabecalhoPlanilha(wl, 9, "Lançamentos de desperdício", dados);
  const linhaCabecalho = l;
  l = cabecalhoTabela(wl, l, ["Data", "Item", "Origem", "Tipo", "Motivo", "Quantidade", "Custo un.", "Total", "Observação"]);
  itens.forEach((d, i) => {
    const [a, m, dia] = d.data.split("-").map(Number);
    linhaTabela(
      wl,
      l,
      [d.data, d.descricao, ORIGEM_LABEL[d.origem], TIPO_LABEL[d.tipo], MOTIVO_LABEL[d.motivo], d.quantidade, d.custoUnitario, d.total, d.observacao ?? ""],
      i,
      { 5: fmtQtd, 6: fmtBRL, 7: fmtBRL }
    );
    const celData = wl.getCell(l, 1);
    celData.value = new Date(Date.UTC(a, m - 1, dia));
    celData.numFmt = "dd/mm/yyyy";
    l++;
  });
  if (itens.length > 0) {
    wl.autoFilter = { from: { row: linhaCabecalho, column: 1 }, to: { row: l - 1, column: 9 } };
    linhaTabela(wl, l, ["", "Total geral", "", "", "", quantidade, "", total, ""], 0, { 5: fmtQtd, 7: fmtBRL }, true);
  } else {
    wl.getCell(l, 1).value = "Sem lançamentos com esses filtros.";
    wl.getCell(l, 1).font = { size: 10, italic: true, color: { argb: "FF94A3B8" } };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
