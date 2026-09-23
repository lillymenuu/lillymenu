import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheDreFinanceiro } from "@/db/queries/financeiroRelatorios";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ano = searchParams.get("ano") ? Number(searchParams.get("ano")) : undefined;

  const resultado = await detalheDreFinanceiro(sessao.lojaId, ano);
  const meses: Record<string, unknown> = {};
  for (const [mes, r] of Object.entries(resultado.meses)) {
    meses[mes] = { reference_month: r.referenceMonth, reference_year: r.referenceYear, total_income: r.totalIncome, total_expense: r.totalExpense, profit_or_loss: r.profitOrLoss, margin_percent: r.marginPercent };
  }

  return NextResponse.json({ ok: true, ano: resultado.ano, anos: resultado.anos, meses });
}
