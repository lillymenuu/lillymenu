import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { criarLancamento, atualizarLancamento } from "@/db/queries/financeiroCore";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);

  const input = {
    accountId: body?.account_id,
    categoryId: body?.category_id,
    paymentMethodId: body?.payment_method_id,
    type: body?.type,
    description: body?.description,
    amount: body?.amount,
    transactionDate: body?.transaction_date,
    referenceMonth: body?.reference_month,
    referenceYear: body?.reference_year,
    notes: body?.notes,
  };

  try {
    const item = id > 0 ? await atualizarLancamento(sessao.lojaId, id, input) : await criarLancamento(sessao.lojaId, input);
    return NextResponse.json({
      ok: true,
      msg: id > 0 ? "Lançamento atualizado com sucesso." : "Lançamento criado com sucesso.",
      item: {
        id: item.id,
        type: item.type,
        description: item.description,
        amount: item.amount,
        transaction_date: item.transactionDate,
        reference_month: item.referenceMonth,
        reference_year: item.referenceYear,
        notes: item.notes,
        account_id: item.accountId,
        category_id: item.categoryId,
        payment_method_id: item.paymentMethodId,
        order_id: item.orderId,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Dados inválidos.";
    return NextResponse.json({ ok: false, msg }, { status: 422 });
  }
}
