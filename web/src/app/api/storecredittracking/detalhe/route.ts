import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheFiado } from "@/db/queries/fiado";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const clienteId = Number(request.nextUrl.searchParams.get("cliente_id") ?? 0);
  const pagina = Number(request.nextUrl.searchParams.get("pagina") ?? "1");

  const resultado = await detalheFiado(sessao.lojaId, clienteId, pagina);
  if (!resultado.ok) return NextResponse.json(resultado);

  const { cliente, lancamentos } = resultado;
  return NextResponse.json({
    ok: true,
    cliente: { id: cliente.id, nome: cliente.nome ?? "", telefone: cliente.telefone ?? "", saldo_fiado: cliente.saldoFiado },
    lancamentos: lancamentos.map((l) => ({
      id: l.id,
      tipo: l.tipo,
      valor: l.valor,
      saldo_antes: l.saldoAntes,
      saldo_depois: l.saldoDepois,
      observacao: l.observacao,
      criado_em: l.criadoEm,
      pedido_id: l.pedidoId,
      pedido_codigo: l.pedidoCodigo,
      forma_pagamento: l.formaPagamento,
      operador_nome: l.operadorNome,
    })),
    pagina: resultado.pagina,
    paginas: resultado.paginas,
    total: resultado.total,
  });
}
