import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { resumoCaixaAtual } from "@/db/queries/caixaResumo";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const resultado = await resumoCaixaAtual(sessao.lojaId);
  if (!resultado.caixa) return NextResponse.json({ ok: true, caixa: null });

  const { caixa, resumo, movimentos } = resultado;
  return NextResponse.json({
    ok: true,
    caixa: { id: caixa.id, status: caixa.status, saldo_inicial: caixa.saldoInicial, aberto_em: caixa.abertoEm, operador: caixa.operador },
    resumo: {
      saldo_inicial_dia: resumo.saldoInicialDia,
      pagamentos: resumo.pagamentos,
      saldo_esperado: resumo.saldoEsperado,
      entrada_total: resumo.entradaTotal,
      saida_total: resumo.saidaTotal,
      saldo_total: resumo.saldoTotal,
      troco: resumo.troco,
      taxa_maquininha: resumo.taxaMaquininha,
      sangrias_total: resumo.sangriasTotal,
      total_vendas: resumo.totalVendas,
      taxa_entrega: resumo.taxaEntrega,
      total_sem_taxa_entrega: resumo.totalSemTaxaEntrega,
    },
    movimentos: movimentos.map((m) => ({ uid: m.uid, forma: m.forma, valor: m.valor, criado_em: m.criadoEm, observacoes: m.observacoes, direcao: m.direcao, origem: m.origem })),
  });
}
