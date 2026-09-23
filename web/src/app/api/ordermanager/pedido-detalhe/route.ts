import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalhePedido } from "@/db/queries/pedidosAdmin";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const id = Number(request.nextUrl.searchParams.get("id") ?? "0");
  const resultado = await detalhePedido(sessao.lojaId, id);
  if (!resultado.ok) return NextResponse.json(resultado);

  const { editadoPor, ...pedidoResto } = resultado.pedido;
  return NextResponse.json({
    ok: true,
    pedido: { ...pedidoResto, editado_por: editadoPor },
    cliente_stats: {
      pedidos_feitos: resultado.clienteStats.pedidosFeitos,
      ticket_medio: resultado.clienteStats.ticketMedio,
      cashback_total: resultado.clienteStats.cashbackTotal,
      cashback_saldo: resultado.clienteStats.cashbackSaldo,
      cashback_expira_em: resultado.clienteStats.cashbackExpiraEm,
      cashback_expirado: resultado.clienteStats.cashbackExpirado,
      pontos: resultado.clienteStats.pontos,
    },
    itens: resultado.itens.map((i) => ({
      produto_id: i.produtoId,
      produto_nome: i.produtoNome,
      quantidade: i.quantidade,
      preco: i.preco,
      observacoes: i.observacoes,
    })),
    pagamentos: resultado.pagamentos.map((p) => ({ forma: p.forma, valor: p.valor, taxa_maquininha: p.taxaMaquininha })),
  });
}
