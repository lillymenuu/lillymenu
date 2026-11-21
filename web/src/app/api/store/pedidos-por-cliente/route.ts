import { NextResponse } from "next/server";
import { pedidosPorCliente } from "@/db/queries/storeCliente";
import { tokenCliente, tokenPedido } from "@/db/queries/tokenPublico";
import { limitar } from "@/lib/limiteTentativas";

export async function GET(request: Request) {
  const bloqueio = await limitar(request, "store-pedidos-por-cliente", { max: 30, janelaSegundos: 600 });
  if (bloqueio) return bloqueio;

  const url = new URL(request.url);
  const tel = url.searchParams.get("tel") ?? "";
  const lojaId = Number(url.searchParams.get("loja_id") ?? "0");

  if (!tel || lojaId <= 0) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" });
  }

  const resultado = await pedidosPorCliente(lojaId, tel);
  if (!resultado.ok) return NextResponse.json(resultado);

  /* So o que o cardapio usa (Meus pedidos / Clube de pontos). Endereco e itens nao saem mais por
     aqui: bastava saber o telefone de alguem pra ler o endereco completo dele. */
  return NextResponse.json({
    ok: true,
    cliente: {
      id: resultado.cliente.id,
      nome: resultado.cliente.nome,
      telefone: resultado.cliente.telefone,
      saldo: resultado.cliente.saldo,
      token: tokenCliente(lojaId, resultado.cliente.id),
    },
    pedidos: resultado.pedidos.map((p) => ({
      id: p.id,
      status: p.status,
      total: p.total,
      forma_pagamento: p.formaPagamento,
      criado_em: p.criadoEm,
      tipo: p.tipo,
      codigo: p.codigo,
      token: tokenPedido(p.id),
    })),
  });
}
