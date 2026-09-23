import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { finalizarEnvio } from "@/db/queries/broadcastList";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const envioId = Number(body?.envio_id ?? 0);

  const resultado = await finalizarEnvio(sessao.lojaId, envioId);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    resumo: {
      total_destinatarios: resultado.resumo.totalDestinatarios,
      total_enviados: resultado.resumo.totalEnviados,
      total_falhas: resultado.resumo.totalFalhas,
    },
  });
}
