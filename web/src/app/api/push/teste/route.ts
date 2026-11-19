import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { enviarPushEndpoint } from "@/lib/webPush";

/* Envia uma notificacao de teste so para o aparelho que pediu. */
export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Sessão expirada." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) return NextResponse.json({ ok: false, msg: "Aparelho não inscrito." }, { status: 400 });

  const enviadas = await enviarPushEndpoint(sessao.lojaId, endpoint, {
    titulo: "Notificações ativadas",
    corpo: "Você vai receber um aviso aqui sempre que chegar um pedido.",
    url: "/ordermanager",
    tag: "teste",
  });
  if (enviadas === 0) return NextResponse.json({ ok: false, msg: "Não foi possível enviar. Desative e ative de novo." });
  return NextResponse.json({ ok: true });
}
