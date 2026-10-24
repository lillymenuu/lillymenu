import { NextResponse } from "next/server";
import { statusMesaPublico } from "@/db/queries/storeCliente";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lojaId = Number(url.searchParams.get("loja_id") ?? "0");
  const mesaId = Number(url.searchParams.get("mesa_id") ?? "0");

  if (!lojaId || !mesaId) return NextResponse.json({ ok: false, msg: "Parâmetros inválidos." });

  const resultado = await statusMesaPublico(lojaId, mesaId);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    mesa: { nome: resultado.mesa.nome, aberta_em: resultado.mesa.abertaEm, conta_solicitada: resultado.mesa.contaSolicitada },
    pedidos: resultado.pedidos.map((p) => ({
      pedido: {
        id: p.pedido.id,
        codigo: p.pedido.codigo,
        status: p.pedido.status,
        tipo: p.pedido.tipo,
        total: p.pedido.total,
        taxa_entrega: p.pedido.taxaEntrega,
        forma_pagamento: p.pedido.formaPagamento,
        troco: p.pedido.troco,
        subtotal: p.pedido.subtotal,
        desconto: p.pedido.desconto,
        cashback_usado: p.pedido.cashbackUsado,
        endereco_entrega: p.pedido.enderecoEntrega,
        avaliado: p.pedido.avaliado,
        criado_em: p.pedido.criadoEm,
        nome: p.pedido.nome,
        telefone: p.pedido.telefone,
        agendamento: p.pedido.agendamento,
        agendamento_em: null,
        tipo_agendamento: null,
      },
      itens: p.itens.map((i) => ({ produto_nome: i.produtoNome, quantidade: i.quantidade, preco: i.preco, observacoes: i.observacoes })),
    })),
  });
}
