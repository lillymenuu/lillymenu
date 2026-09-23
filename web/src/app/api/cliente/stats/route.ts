import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { clienteStats } from "@/db/queries/clientesAdmin";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const id = Number(request.nextUrl.searchParams.get("id") ?? 0);
  const resultado = await clienteStats(sessao.lojaId, id);
  if (!resultado.ok) return NextResponse.json(resultado);

  const s = resultado.stats;
  return NextResponse.json({
    ok: true,
    nome: s.nome,
    telefone: s.telefone,
    email: s.email,
    nivel: s.nivel,
    endereco: s.endereco,
    aniversario: s.aniversario,
    criado_em: s.criadoEm,
    cashback: s.cashback,
    pontos: s.pontos,
    saldo_fiado: s.saldoFiado,
    ticket_medio: s.ticketMedio,
    ultimo_pedido: s.ultimoPedido,
    pedidos_feitos: s.pedidosFeitos,
    avaliacao_media: s.avaliacaoMedia,
  });
}
