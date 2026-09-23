import "server-only";
import { detalheLancamentos } from "@/db/queries/financeiroSync";
import type { FinanceiroLancamentosResposta } from "@/lib/financeiroLancamentos";

export async function getFinanceiroLancamentos(
  lojaId: number,
  params?: { mes?: number; ano?: number; tipo?: string; categoria_id?: number; conta_id?: number; page?: number }
): Promise<FinanceiroLancamentosResposta> {
  const resultado = await detalheLancamentos(lojaId, {
    mes: params?.mes,
    ano: params?.ano,
    tipo: params?.tipo,
    categoriaId: params?.categoria_id,
    contaId: params?.conta_id,
    page: params?.page,
  });

  return {
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
  };
}
