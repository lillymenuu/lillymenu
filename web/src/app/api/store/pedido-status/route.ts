import { NextResponse } from "next/server";
import { detalhePedidoPublico } from "@/db/queries/storeCliente";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id") ?? "0");
  const clienteId = Number(url.searchParams.get("cliente_id") ?? "0");

  if (!id) {
    return NextResponse.json({ ok: false, msg: "ID invalido" });
  }

  const resultado = await detalhePedidoPublico(id, clienteId);
  if (!resultado.ok) return NextResponse.json(resultado);

  const p = resultado.pedido;
  return NextResponse.json({
    ok: true,
    pedido: {
      id: p.id,
      codigo: p.codigo,
      status: p.status,
      tipo: p.tipo,
      total: p.total,
      taxa_entrega: p.taxaEntrega,
      forma_pagamento: p.formaPagamento,
      troco: p.troco,
      subtotal: p.subtotal,
      desconto: p.desconto,
      cashback_usado: p.cashbackUsado,
      endereco_entrega: p.enderecoEntrega,
      avaliado: p.avaliado,
      criado_em: p.criadoEm,
      nome: p.nome,
      telefone: p.telefone,
      agendamento: p.agendamento,
      agendamento_em: null,
      tipo_agendamento: null,
    },
    itens: resultado.itens.map((i) => ({ produto_nome: i.produtoNome, quantidade: i.quantidade, preco: i.preco, observacoes: i.observacoes })),
  });
}
