import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarFormaPagamento } from "@/db/queries/financeiroCore";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);

  try {
    const item = await salvarFormaPagamento(sessao.lojaId, { id: id > 0 ? id : undefined, name: body?.name, active: body?.active });
    return NextResponse.json({
      ok: true,
      msg: id > 0 ? "Forma de pagamento atualizada com sucesso." : "Forma de pagamento criada com sucesso.",
      item: { id: item.id, name: item.name, active: item.active },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Dados inválidos.";
    return NextResponse.json({ ok: false, msg }, { status: 422 });
  }
}
