import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { montarDashboard } from "@/db/queries/dashboard";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const periodo = Number(request.nextUrl.searchParams.get("periodo") ?? "7");
  const data = await montarDashboard(sessao.lojaId, periodo);

  return NextResponse.json({
    ok: true,
    periodo: data.periodo,
    grafico: { labels: data.grafico.labels, serie_pedidos: data.grafico.seriePedidos, serie_valores: data.grafico.serieValores },
  });
}
