import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheCaixa } from "@/db/queries/caixaDetalhe";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const caixaId = Number(request.nextUrl.searchParams.get("caixa_id") ?? 0);
  const resultado = await detalheCaixa(sessao.lojaId, caixaId);
  if (!resultado.ok) return NextResponse.json(resultado);

  const { caixa, resumo, formas, linhas } = resultado;
  return NextResponse.json({
    ok: true,
    caixa: {
      id: caixa.id,
      status: caixa.status,
      aberto_em: caixa.abertoEm,
      fechado_em: caixa.fechadoEm,
      saldo_inicial: caixa.saldoInicial,
      saldo_final: caixa.saldoFinal,
      operador: caixa.operador,
    },
    resumo: {
      entrada: resumo.entrada,
      saida: resumo.saida,
      saldo: resumo.saldo,
      pedidos_total: resumo.pedidosTotal,
      manual_entrada: resumo.manualEntrada,
      manual_saida: resumo.manualSaida,
    },
    formas,
    linhas: linhas.map((l) => ({ uid: l.uid, forma: l.forma, valor: l.valor, criado_em: l.criadoEm, observacoes: l.observacoes, direcao: l.direcao, origem: l.origem })),
  });
}
