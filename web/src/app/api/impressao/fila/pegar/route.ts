import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { concluirTrabalhoImpressao, pegarTrabalhosImpressao } from "@/db/queries/impressaoFila";

/*
 * Fila de impressao entre computadores (lado do computador que tem a impressora).
 * POST {perfis: string[]} pega os pendentes das impressoras vinculadas aqui;
 * POST {concluir: id, ok: boolean, erro?: string} marca o resultado.
 */
export async function POST(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { perfis?: unknown; concluir?: unknown; ok?: unknown; erro?: unknown } | null;

  if (body?.concluir !== undefined) {
    const id = Number(body.concluir);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });
    await concluirTrabalhoImpressao(sessao.lojaId, id, body.ok === true, typeof body.erro === "string" ? body.erro : undefined);
    return NextResponse.json({ ok: true });
  }

  const perfis = Array.isArray(body?.perfis) ? body.perfis.filter((p): p is string => typeof p === "string") : [];
  return NextResponse.json({ ok: true, trabalhos: await pegarTrabalhosImpressao(sessao.lojaId, perfis) });
}
