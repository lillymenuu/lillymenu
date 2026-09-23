import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { relatorioCrossSell } from "@/db/queries/relatorioCrossSell";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const resultado = await relatorioCrossSell({
    lojaId: sessao.lojaId,
    periodo: params.get("periodo") ?? undefined,
    dataIni: params.get("data_ini") ?? undefined,
    dataFim: params.get("data_fim") ?? undefined,
  });

  return NextResponse.json({
    ok: true,
    periodo: resultado.periodo,
    resumo: {
      faturamento: resultado.resumo.faturamento,
      itens_vendidos: resultado.resumo.itensVendidos,
      pedidos_cross_sell: resultado.resumo.pedidosCrossSell,
      ticket_medio: resultado.resumo.ticketMedio,
    },
    por_dia: resultado.porDia,
    top_produtos: resultado.topProdutos,
    itens: resultado.itens.map((i) => ({ codigo: i.codigo, cliente: i.cliente, produto_nome: i.produtoNome, quantidade: i.quantidade, preco: i.preco, subtotal: i.subtotal, criado_em: i.criadoEm })),
  });
}
