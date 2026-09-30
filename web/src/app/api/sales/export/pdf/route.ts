import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getConfig } from "@/db/queries/config";
import { getRelatorioVendasExport } from "@/lib/relatorios";
import { periodoLabelExport, tipoLabelExport } from "@/lib/vendasExportHelpers";
import { gerarPdfVendas } from "@/lib/vendasPdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const periodo = searchParams.get("periodo") ?? "hoje";
  const tipo = searchParams.get("tipo") ?? "";
  const dataIni = searchParams.get("data_ini") ?? undefined;
  const dataFim = searchParams.get("data_fim") ?? undefined;

  const [relatorio, nomeLoja, logoUrl] = await Promise.all([
    getRelatorioVendasExport(sessao.lojaId, { periodo, tipo: tipo || undefined, data_ini: dataIni, data_fim: dataFim }),
    getConfig(sessao.lojaId, "nome_loja", "Loja"),
    getConfig(sessao.lojaId, "loja_perfil", ""),
  ]);

  const pdf = await gerarPdfVendas({
    loja: { nome: nomeLoja, logoUrl },
    periodoLabel: periodoLabelExport(periodo, relatorio),
    tipoLabel: tipoLabelExport(tipo),
    relatorio,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=relatorio-vendas.pdf`,
      "Cache-Control": "private, no-store",
    },
  });
}
