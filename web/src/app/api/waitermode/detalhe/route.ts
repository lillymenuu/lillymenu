import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheModoGarcom } from "@/db/queries/modoGarcom";

function protocoloHostDe(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const resultado = await detalheModoGarcom(sessao.lojaId, protocoloHostDe(request));

  return NextResponse.json({
    ok: true,
    mesas: resultado.mesas.map((m) => ({ id: m.id, nome: m.nome, ativo: m.ativo ? 1 : 0, criado_em: m.criadoEm, tem_pedido_aberto: m.temPedidoAberto })),
    garcons: resultado.garcons.map((g) => ({ id: g.id, nome: g.nome, email: g.email, ativo: g.ativo ? 1 : 0, criado_em: g.criadoEm })),
    pedidos_pendentes: resultado.pedidosPendentes,
    mesas_ativas: resultado.mesasAtivas,
    garcons_ativos: resultado.garconsAtivos,
    garcom_login_url: resultado.garcomLoginUrl,
    cardapio_url: resultado.cardapioUrl,
  });
}
