import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { abrirCaixa } from "@/db/queries/caixa";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const resultado = await abrirCaixa({
    lojaId: sessao.lojaId,
    adminId: sessao.id,
    perfil: sessao.perfil,
    saldoInicial: body?.saldo_inicial !== undefined ? Number(body.saldo_inicial) : undefined,
    observacoes: typeof body?.observacoes === "string" ? body.observacoes : undefined,
  });

  return NextResponse.json(resultado);
}
