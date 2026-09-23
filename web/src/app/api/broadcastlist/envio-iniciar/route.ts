import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { iniciarEnvio } from "@/db/queries/broadcastList";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const listaId = Number(body?.lista_id ?? 0);
  const mensagem = typeof body?.mensagem === "string" ? body.mensagem : "";

  const resultado = await iniciarEnvio(sessao.lojaId, listaId, mensagem);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    envio_id: resultado.envioId,
    destinatarios: resultado.destinatarios.map((d) => ({ cliente_id: d.clienteId, nome: d.nome ?? "", telefone: d.telefone ?? "" })),
  });
}
