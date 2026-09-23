import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { excluirCombo } from "@/db/queries/combosAdmin";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const comboId = Number(body?.combo_id ?? 0);
  const resultado = await excluirCombo(sessao.lojaId, comboId);
  return NextResponse.json(resultado);
}
