import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { notificacoesPedidos } from "@/db/queries/notificacoesPedidos";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, pedidos: [] }, { status: 401 });

  const pedidos = await notificacoesPedidos(sessao.lojaId);
  return NextResponse.json({
    ok: true,
    pedidos: pedidos.map((p) => ({ id: p.id, codigo: p.codigo, criado_em: p.criadoEm, cliente: p.cliente, status: p.status, origem: p.origem, tipo: p.tipo, chave: p.chave, nota: p.nota, pedido_id: p.pedidoId })),
  });
}
