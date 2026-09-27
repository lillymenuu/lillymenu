import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { buscarSaidaComprovante } from "@/db/queries/caixa";
import { labelMotivoSaida } from "@/lib/caixaMotivos";
import { formatDataHoraCurta } from "@/components/cliente/types";

function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapeHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { id } = await params;
  const movimentacaoId = Number(id);
  if (!Number.isFinite(movimentacaoId) || movimentacaoId <= 0) {
    return NextResponse.json({ ok: false, msg: "Comprovante invalido." }, { status: 400 });
  }

  const saida = await buscarSaidaComprovante(sessao.lojaId, movimentacaoId);
  if (!saida) return NextResponse.json({ ok: false, msg: "Saída não encontrada." }, { status: 404 });

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Comprovante de saída #${saida.id}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { font-family: "Courier New", monospace; font-size: 12px; color: #000; width: 72mm; margin: 0 auto; padding: 8px 0; }
  h1 { font-size: 13px; text-align: center; margin: 0 0 2px; }
  .loja { text-align: center; margin: 0 0 8px; font-weight: bold; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  .linha { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
  .label { color: #333; }
  .valor { font-weight: bold; font-size: 16px; text-align: center; margin: 8px 0; }
  .obs { margin-top: 4px; white-space: pre-wrap; }
  .assinatura { margin-top: 28px; }
  .assinatura .campo { margin-top: 22px; border-top: 1px solid #000; padding-top: 2px; text-align: center; font-size: 11px; }
  .botoes { text-align: center; margin-top: 16px; }
  .botoes button { font-size: 13px; padding: 6px 14px; }
  @media print { .botoes { display: none; } }
</style>
</head>
<body>
  <div class="loja">${escapeHtml(saida.lojaNome ?? "")}</div>
  <h1>COMPROVANTE DE SAÍDA DE CAIXA</h1>
  <hr />
  <div class="linha"><span class="label">Nº saída</span><span>#${saida.id}</span></div>
  <div class="linha"><span class="label">Caixa (turno)</span><span>#${saida.caixaId}</span></div>
  <div class="linha"><span class="label">Data/hora</span><span>${escapeHtml(formatDataHoraCurta(saida.criadoEm))}</span></div>
  <div class="linha"><span class="label">Operador</span><span>${escapeHtml(saida.operador ?? "-")}</span></div>
  <div class="linha"><span class="label">Motivo</span><span>${escapeHtml(labelMotivoSaida(saida.motivo))}</span></div>
  <div class="linha"><span class="label">Autorizado por</span><span>${escapeHtml(saida.autorizadoPor ?? "-")}</span></div>
  <hr />
  <div class="valor">${formatBRL(saida.valor)}</div>
  ${saida.observacoes ? `<div class="obs">${escapeHtml(saida.observacoes)}</div>` : ""}
  <hr />
  <div class="assinatura">
    <div class="campo">Assinatura do operador</div>
    <div class="campo">Assinatura de quem recebeu</div>
  </div>
  <div class="botoes"><button onclick="window.print()">Imprimir</button></div>
  <script>window.print();</script>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
