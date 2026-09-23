import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { enviarItemEnvio } from "@/db/queries/broadcastList";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const envioId = Number(body?.envio_id ?? 0);
  const clienteId = Number(body?.cliente_id ?? 0);

  const resultado = await enviarItemEnvio(sessao.lojaId, envioId, clienteId);
  return NextResponse.json(resultado);
}
