import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarContasFinanceiras } from "@/db/queries/financeiroCore";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const contas = await listarContasFinanceiras(sessao.lojaId, false);
  return NextResponse.json({
    ok: true,
    contas: contas.map((c) => ({ id: c.id, name: c.name, initial_balance: c.initialBalance, current_balance: c.currentBalance, active: c.active })),
  });
}
