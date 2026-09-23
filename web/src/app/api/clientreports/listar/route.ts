import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { relatorioClientes } from "@/db/queries/relatoriosClientes";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const ORDENAR_VALIDOS = ["total_gasto", "pedidos", "ticket_medio", "ultimo_pedido", "nome"] as const;
  const ordenarRaw = params.get("ordenar") ?? "";
  const ordenar = (ORDENAR_VALIDOS as readonly string[]).includes(ordenarRaw) ? (ordenarRaw as (typeof ORDENAR_VALIDOS)[number]) : undefined;

  const resultado = await relatorioClientes({
    lojaId: sessao.lojaId,
    busca: params.get("busca") ?? undefined,
    ordenar,
    periodo: params.get("periodo") ?? undefined,
    dataIni: params.get("data_ini") ?? undefined,
    dataFim: params.get("data_fim") ?? undefined,
    pagina: params.get("pagina") ? Number(params.get("pagina")) : undefined,
    limite: params.get("limite") ? Number(params.get("limite")) : undefined,
  });

  return NextResponse.json({
    ok: true,
    clientes: resultado.clientes.map((c) => ({
      cliente_id: c.clienteId,
      nome: c.nome,
      telefone: c.telefone,
      ultimo_pedido: c.ultimoPedido,
      total_taxa: c.totalTaxa,
      ticket_medio: c.ticketMedio,
      total_gasto: c.totalGasto,
      pedidos_feitos: c.pedidosFeitos,
    })),
    total: resultado.total,
    paginas: resultado.paginas,
    pagina: resultado.pagina,
    limite: resultado.limite,
  });
}
