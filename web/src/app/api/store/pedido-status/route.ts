import { NextResponse } from "next/server";
import { detalhePedidoPublico } from "@/db/queries/storeCliente";
import { conferirTokenPedido } from "@/db/queries/tokenPublico";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id") ?? "0");
  const token = url.searchParams.get("token") ?? "";

  if (!id) {
    return NextResponse.json({ ok: false, msg: "ID invalido" });
  }
  /* O id e sequencial: sem o token assinado, qualquer um lia nome/telefone/endereco de qualquer pedido. */
  if (!conferirTokenPedido(id, token)) {
    return NextResponse.json({ ok: false, msg: "Acesso negado" }, { status: 403 });
  }

  const resultado = await detalhePedidoPublico(id, 0);
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
      token,
    },
    itens: resultado.itens.map((i) => ({ produto_nome: i.produtoNome, quantidade: i.quantidade, preco: i.preco, observacoes: i.observacoes })),
  });
}
