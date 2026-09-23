import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { excluirContaFinanceira } from "@/db/queries/financeiroCore";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  if (id <= 0) return NextResponse.json({ ok: false, msg: "Conta inválida." });

  const resultado = await excluirContaFinanceira(sessao.lojaId, id);
  if (!resultado.ok) return NextResponse.json(resultado, { status: 422 });

  return NextResponse.json({ ok: true, msg: "Conta excluída com sucesso." });
}
