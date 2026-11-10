import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { definirPausaTv } from "@/db/queries/midiaIndoor";

/* Botao "Parar exibicao" / "Retomar" do card da TV. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const ok = await definirPausaTv(sessao.lojaId, Number(id), body?.pausada === true);
  return NextResponse.json(ok ? { ok: true } : { ok: false, msg: "TV não encontrada." });
}
