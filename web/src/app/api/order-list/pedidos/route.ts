import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarPedidos } from "@/db/queries/pedidosAdmin";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const resultado = await listarPedidos({
    lojaId: sessao.lojaId,
    status: params.get("status") ?? undefined,
    dataIni: params.get("data_ini") ?? undefined,
    dataFim: params.get("data_fim") ?? undefined,
    pagina: params.get("pagina") ? Number(params.get("pagina")) : undefined,
    limite: params.get("limite") ? Number(params.get("limite")) : undefined,
  });

  return NextResponse.json({
    ok: true,
    pedidos: resultado.pedidos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      status: p.status,
      tipo: p.tipo,
      total: p.total ?? 0,
      criado_em: p.criadoEm,
      forma_pagamento: p.formaPagamento,
      endereco_entrega: p.enderecoEntrega,
      nome: p.nome,
      telefone: p.telefone,
      agendamento: p.agendamento,
      origem: p.origem,
      observacoes_cliente: p.observacoesCliente,
      motoboy_id: p.motoboyId,
      motoboy_nome: p.motoboyNome,
      motoboy_whatsapp: p.motoboyWhatsapp,
      status_em: p.statusEm,
      pagamentos: p.pagamentos,
    })),
    total: resultado.total,
    paginas: resultado.paginas,
    pagina: resultado.pagina,
    limite: resultado.limite,
  });
}
