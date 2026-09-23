import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { historicoCaixa } from "@/db/queries/caixaDetalhe";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const tipo = request.nextUrl.searchParams.get("tipo") ?? "fechado";
  const pagina = Number(request.nextUrl.searchParams.get("pagina") ?? "1");

  const resultado = await historicoCaixa(sessao.lojaId, tipo, pagina);
  return NextResponse.json({
    ok: true,
    tipo: resultado.tipo,
    itens: resultado.itens.map((i) => ({ id: i.id, status: i.status, aberto_em: i.abertoEm, fechado_em: i.fechadoEm, operador: i.operador })),
    pagina: resultado.pagina,
    total_paginas: resultado.totalPaginas,
    total: resultado.total,
    mostrando_de: resultado.mostrandoDe,
    mostrando_ate: resultado.mostrandoAte,
  });
}
