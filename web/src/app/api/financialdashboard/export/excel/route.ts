import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getConfig } from "@/db/queries/config";
import { getFinanceiroDashboard } from "@/lib/financeiroDashboardServer";
import { gerarExcelFinanceiro } from "@/lib/financeiroDashboardExcel";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes") ? Number(searchParams.get("mes")) : undefined;
  const ano = searchParams.get("ano") ? Number(searchParams.get("ano")) : undefined;

  const [dados, nomeLoja] = await Promise.all([getFinanceiroDashboard(sessao.lojaId, mes, ano), getConfig(sessao.lojaId, "nome_loja", "Loja")]);

  const excel = await gerarExcelFinanceiro({ loja: { nome: nomeLoja }, dados });

  return new Response(new Uint8Array(excel), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=dashboard-financeiro.xlsx`,
      "Cache-Control": "private, no-store",
    },
  });
}
