import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { relatorioFidelidade } from "@/db/queries/relatoriosFidelidade";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const resultado = await relatorioFidelidade({
    lojaId: sessao.lojaId,
    periodo: params.get("periodo") ?? undefined,
    dataIni: params.get("data_ini") ?? undefined,
    dataFim: params.get("data_fim") ?? undefined,
  });

  return NextResponse.json({
    ok: true,
    data_ini: resultado.dataIni,
    data_fim: resultado.dataFim,
    cashback_saldo_base: resultado.cashbackSaldoBase,
    cashback_utilizado: resultado.cashbackUtilizado,
    pedidos_com_cashback: resultado.pedidosComCashback,
    clientes: resultado.clientes.map((c) => ({ nome: c.nome, criado_em: c.criadoEm, saldo: c.saldo, usado: c.usado, expira_em: c.expiraEm })),
    historico: resultado.historico.map((h) => ({ tipo: h.tipo, classe: h.classe, data: h.data, valor: h.valor })),
    cupom_desconto: resultado.cupomDesconto,
    cupom_pedidos: resultado.cupomPedidos,
  });
}
