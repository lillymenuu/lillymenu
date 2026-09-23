import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { relatorioVendas } from "@/db/queries/relatoriosVendas";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const resultado = await relatorioVendas({
    lojaId: sessao.lojaId,
    periodo: params.get("periodo") ?? undefined,
    dataIni: params.get("data_ini") ?? undefined,
    dataFim: params.get("data_fim") ?? undefined,
    tipo: params.get("tipo") ?? undefined,
    pagina: params.get("pagina") ? Number(params.get("pagina")) : undefined,
    limite: params.get("limite") ? Number(params.get("limite")) : undefined,
  });

  return NextResponse.json({
    ok: true,
    resumo: {
      total_pedidos: resultado.resumo.totalPedidos,
      faturamento: resultado.resumo.faturamento,
      ticket_medio: resultado.resumo.ticketMedio,
      taxa_entrega: resultado.resumo.taxaEntrega,
    },
    fiado_recebido: resultado.fiadoRecebido,
    cancelados: resultado.cancelados,
    cancelados_valor: resultado.canceladosValor,
    vendas_pagamento: resultado.vendasPagamento,
    produtos: resultado.produtos,
    vendas_produtos: resultado.vendasProdutos,
    clientes_frequencia: resultado.clientesFrequencia,
    pedidos: resultado.pedidos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      total: p.total,
      status: p.status,
      tipo: p.tipo,
      forma_pagamento: p.formaPagamento,
      criado_em: p.criadoEm,
      cliente: p.cliente,
    })),
    total: resultado.total,
    paginas: resultado.paginas,
    pagina: resultado.pagina,
    limite: resultado.limite,
  });
}
