import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { excluirFormaPagamento } from "@/db/queries/financeiroCore";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  if (id <= 0) return NextResponse.json({ ok: false, msg: "Forma de pagamento inválida." });

  const resultado = await excluirFormaPagamento(sessao.lojaId, id);
  if (!resultado.ok) return NextResponse.json(resultado, { status: 422 });

  return NextResponse.json({ ok: true, msg: "Forma de pagamento excluída com sucesso." });
}
