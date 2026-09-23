import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { toggleGarcom } from "@/db/queries/modoGarcom";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  const ativo = body?.ativo === 0 || body?.ativo === 1 ? Boolean(body.ativo) : null;

  const resultado = await toggleGarcom(sessao.lojaId, id, ativo);
  return NextResponse.json(resultado);
}
