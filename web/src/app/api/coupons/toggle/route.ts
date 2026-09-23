import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { toggleCupom } from "@/db/queries/cuponsAdmin";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  const ativo = Boolean(Number(body?.ativo ?? 0));

  const resultado = await toggleCupom(sessao.lojaId, id, ativo);
  return NextResponse.json(resultado);
}
