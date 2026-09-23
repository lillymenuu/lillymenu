import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { excluirConversas } from "@/db/queries/whatsLilly";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.map((n: unknown) => Number(n)) : [];

  const resultado = await excluirConversas(sessao.lojaId, ids);
  return NextResponse.json(resultado);
}
