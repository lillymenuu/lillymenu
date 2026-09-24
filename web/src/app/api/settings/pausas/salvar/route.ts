import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarPausa } from "@/db/queries/pausasFuncionamento";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await salvarPausa(sessao.lojaId, {
    titulo: String(body.titulo ?? ""),
    dataInicio: String(body.data_inicio ?? ""),
    horaInicio: String(body.hora_inicio ?? ""),
    dataFim: String(body.data_fim ?? ""),
    horaFim: String(body.hora_fim ?? ""),
  });

  return NextResponse.json(resultado);
}
