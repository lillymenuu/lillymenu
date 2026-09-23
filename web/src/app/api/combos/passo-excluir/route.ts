import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { excluirPassoCombo } from "@/db/queries/combosAdmin";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const passoId = Number(body?.passo_id ?? 0);
  const resultado = await excluirPassoCombo(sessao.lojaId, passoId);
  return NextResponse.json(resultado);
}
