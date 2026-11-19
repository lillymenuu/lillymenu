import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { enviarPushAdmin } from "@/lib/webPush";

/* Envia uma notificacao de teste para todos os aparelhos inscritos do usuario logado
   (clicar no computador tambem testa o celular dele). */
export async function POST() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Sessão expirada." }, { status: 401 });

  const enviadas = await enviarPushAdmin(sessao.lojaId, sessao.id, {
    titulo: "Teste de notificação",
    corpo: "Tudo certo! Você vai receber um aviso aqui sempre que chegar um pedido.",
    url: "/ordermanager",
    tag: "teste",
  });
  if (enviadas === 0) return NextResponse.json({ ok: false, msg: "Nenhum aparelho recebeu. Desative e ative de novo." });
  return NextResponse.json({ ok: true, enviadas });
}
