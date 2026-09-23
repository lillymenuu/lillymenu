import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { gerenciarMotoboys } from "@/db/queries/motoboys";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const periodo = params.get("periodo") ?? "hoje";
  const dataInicio = params.get("data_inicio") ?? "";
  const dataFim = params.get("data_fim") ?? "";

  const resultado = await gerenciarMotoboys(sessao.lojaId, periodo, dataInicio, dataFim);
  return NextResponse.json({
    ok: true,
    periodo: resultado.periodo,
    data_inicio: resultado.dataInicio,
    data_fim: resultado.dataFim,
    stats: { total_motoboys: resultado.stats.totalMotoboys, entregas_periodo: resultado.stats.entregasPeriodo, taxas_periodo: resultado.stats.taxasPeriodo },
    motoboys: resultado.motoboys.map((m) => ({ id: m.id, nome: m.nome, whatsapp: m.whatsapp, data_cadastro: m.dataCadastro, ativo: m.ativo ? 1 : 0, entregas_periodo: m.entregasPeriodo, taxas_periodo: m.taxasPeriodo })),
  });
}
