import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { fecharCaixa } from "@/db/queries/caixa";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const resultado = await fecharCaixa({
    lojaId: sessao.lojaId,
    adminId: sessao.id,
    caixaId: Number(body?.caixa_id ?? 0),
    saldoFinal: body?.saldo_final !== undefined ? Number(body.saldo_final) : undefined,
    observacoes: typeof body?.observacoes === "string" ? body.observacoes : undefined,
  });

  return NextResponse.json(resultado);
}
