import { NextResponse } from "next/server";
import { pedidosPorCliente } from "@/db/queries/storeCliente";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tel = url.searchParams.get("tel") ?? "";
  const lojaId = Number(url.searchParams.get("loja_id") ?? "0");

  if (!tel || lojaId <= 0) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" });
  }

  const resultado = await pedidosPorCliente(lojaId, tel);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    cliente: {
      id: resultado.cliente.id,
      nome: resultado.cliente.nome,
      telefone: resultado.cliente.telefone,
      saldo: resultado.cliente.saldo,
      cashback_saldo: resultado.cliente.cashbackSaldo,
      rua: resultado.cliente.rua,
      numero: resultado.cliente.numero,
      bairro: resultado.cliente.bairro,
      cidade: resultado.cliente.cidade,
      estado: resultado.cliente.estado,
      cep: resultado.cliente.cep,
      complemento: resultado.cliente.complemento,
    },
    pedidos: resultado.pedidos.map((p) => ({
      id: p.id,
      status: p.status,
      total: p.total,
      taxa_entrega: p.taxaEntrega,
      forma_pagamento: p.formaPagamento,
      criado_em: p.criadoEm,
      tipo: p.tipo,
      endereco_entrega: p.enderecoEntrega,
      subtotal: p.subtotal,
      codigo: p.codigo,
      itens: p.itens.map((i) => ({ produto_nome: i.produtoNome, quantidade: i.quantidade, preco: i.preco, observacoes: i.observacoes })),
    })),
  });
}
