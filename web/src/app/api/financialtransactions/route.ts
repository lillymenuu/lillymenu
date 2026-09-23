import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheLancamentosFinanceiro } from "@/db/queries/financeiroRelatorios";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const resultado = await detalheLancamentosFinanceiro(sessao.lojaId, {
    mes: searchParams.get("mes") ? Number(searchParams.get("mes")) : undefined,
    ano: searchParams.get("ano") ? Number(searchParams.get("ano")) : undefined,
    tipo: searchParams.get("tipo") ?? undefined,
    categoriaId: searchParams.get("categoria_id") ? Number(searchParams.get("categoria_id")) : undefined,
    contaId: searchParams.get("conta_id") ? Number(searchParams.get("conta_id")) : undefined,
    pagina: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
  });

  return NextResponse.json({
    ok: true,
    mes: resultado.mes,
    ano: resultado.ano,
    anos: resultado.anos,
    tipo: resultado.tipo,
    categoria_id: resultado.categoriaId,
    conta_id: resultado.contaId,
    page: resultado.page,
    per_page: resultado.perPage,
    total: resultado.total,
    total_paginas: resultado.totalPaginas,
    lancamentos: resultado.lancamentos.map((l) => ({
      id: l.id,
      type: l.type,
      description: l.description,
      amount: l.amount,
      transaction_date: l.transactionDate,
      reference_month: l.referenceMonth,
      reference_year: l.referenceYear,
      notes: l.notes,
      account_id: l.accountId,
      account_name: l.accountName,
      category_id: l.categoryId,
      category_name: l.categoryName,
      payment_method_id: l.paymentMethodId,
      payment_method_name: l.paymentMethodName,
      order_id: l.orderId,
    })),
    categorias: resultado.categorias,
    contas: resultado.contas,
    formas_pagamento: resultado.formasPagamento,
  });
}
