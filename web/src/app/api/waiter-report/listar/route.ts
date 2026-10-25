import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getWaiterReport } from "@/lib/waiterReport";
import type { Turno } from "@/db/queries/relatorioGarcom";

const TURNOS_VALIDOS: Turno[] = ["todos", "manha", "tarde", "noite"];

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const turnoParam = params.get("turno") ?? "todos";
  const turno = TURNOS_VALIDOS.includes(turnoParam as Turno) ? (turnoParam as Turno) : "todos";
  const garcomIdParam = params.get("garcom_id");

  const resultado = await getWaiterReport(sessao.lojaId, {
    periodo: params.get("periodo") ?? undefined,
    data_ini: params.get("data_ini") ?? undefined,
    data_fim: params.get("data_fim") ?? undefined,
    turno,
    garcom_id: garcomIdParam ? Number(garcomIdParam) : undefined,
  });

  return NextResponse.json(resultado);
}
