import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { relatorioCanaisVenda } from "@/db/queries/relatorioCanaisVenda";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const resultado = await relatorioCanaisVenda({
    lojaId: sessao.lojaId,
    periodo: params.get("periodo") || "hoje",
    dataIni: params.get("data_ini") ?? undefined,
    dataFim: params.get("data_fim") ?? undefined,
    canal: params.get("canal") ?? undefined,
  });

  return NextResponse.json({ ok: true, ...resultado });
}
