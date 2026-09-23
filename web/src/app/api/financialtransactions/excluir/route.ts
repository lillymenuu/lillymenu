import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { excluirLancamento } from "@/db/queries/financeiroCore";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  if (id <= 0) return NextResponse.json({ ok: false, msg: "Lançamento inválido." });

  try {
    const excluiu = await excluirLancamento(sessao.lojaId, id);
    if (!excluiu) return NextResponse.json({ ok: false, msg: "Lançamento inválido." }, { status: 422 });
    return NextResponse.json({ ok: true, msg: "Lançamento excluído com sucesso." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao excluir lançamento.";
    return NextResponse.json({ ok: false, msg }, { status: 422 });
  }
}
