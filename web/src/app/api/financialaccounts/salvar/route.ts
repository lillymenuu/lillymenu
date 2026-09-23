import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarContaFinanceira } from "@/db/queries/financeiroCore";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);

  try {
    const item = await salvarContaFinanceira(sessao.lojaId, {
      id: id > 0 ? id : undefined,
      name: body?.name,
      initialBalance: body?.initial_balance,
      currentBalance: body?.current_balance,
      active: body?.active,
    });
    return NextResponse.json({
      ok: true,
      msg: id > 0 ? "Conta atualizada com sucesso." : "Conta criada com sucesso.",
      item: { id: item.id, name: item.name, initial_balance: item.initialBalance, current_balance: item.currentBalance, active: item.active },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Dados inválidos.";
    return NextResponse.json({ ok: false, msg }, { status: 422 });
  }
}
