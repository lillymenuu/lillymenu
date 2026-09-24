import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarPausas } from "@/db/queries/pausasFuncionamento";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const pausas = await listarPausas(sessao.lojaId);
  return NextResponse.json({
    ok: true,
    pausas: pausas.map((p) => ({ id: p.id, titulo: p.titulo, data_inicio: p.dataInicio, hora_inicio: p.horaInicio, data_fim: p.dataFim, hora_fim: p.horaFim })),
  });
}
