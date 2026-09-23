import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { toggleFlyersAtivo } from "@/db/queries/promocoes";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ativo = Boolean(Number(body?.ativo ?? 0));

  const resultado = await toggleFlyersAtivo(sessao.lojaId, ativo);
  return NextResponse.json(resultado);
}
