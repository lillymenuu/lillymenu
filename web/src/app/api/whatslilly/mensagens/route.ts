import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheConversa } from "@/db/queries/whatsLilly";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const conversaId = Number(searchParams.get("conversa_id") ?? 0);

  const resultado = await detalheConversa(sessao.lojaId, conversaId);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    conversa: resultado.conversa,
    mensagens: resultado.mensagens.map((m) => ({ id: m.id, direcao: m.direcao, tipo: m.tipo, mensagem: m.mensagem, pedido_id: m.pedidoId, hora: m.hora, data_fmt: m.dataFmt, falhou: m.falhou })),
    pedidos: resultado.pedidos.map((p) => ({ id: p.id, total: p.total, status: p.status, criado_fmt: p.criadoFmt })),
  });
}
