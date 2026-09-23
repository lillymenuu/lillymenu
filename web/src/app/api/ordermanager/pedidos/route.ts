import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { kanbanPedidos } from "@/db/queries/pedidosAdmin";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const resultado = await kanbanPedidos(sessao.lojaId);

  return NextResponse.json({
    ok: true,
    pedidos: resultado.pedidos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      status: p.status,
      tipo: p.tipo,
      total: p.total ?? 0,
      criado_em: p.criadoEm ?? "",
      forma_pagamento: p.formaPagamento,
      endereco_entrega: p.enderecoEntrega,
      nome: p.nome,
      telefone: p.telefone ?? "",
      agendamento: p.agendamento,
      origem: p.origem,
      observacoes_cliente: p.observacoesCliente,
      motoboy_id: p.motoboyId,
      motoboy_nome: p.motoboyNome,
      motoboy_whatsapp: p.motoboyWhatsapp,
      status_em: p.statusEm,
      pagamentos: p.pagamentos,
    })),
  });
}
