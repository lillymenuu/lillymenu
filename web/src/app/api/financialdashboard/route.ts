import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getFinanceiroDashboard } from "@/lib/financeiroDashboardServer";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes") ? Number(searchParams.get("mes")) : undefined;
  const ano = searchParams.get("ano") ? Number(searchParams.get("ano")) : undefined;

  return NextResponse.json(await getFinanceiroDashboard(sessao.lojaId, mes, ano));
}
