import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { digitandoSuporteGet, digitandoLojaSet } from "@/db/queries/suporteChat";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const digitando = await digitandoSuporteGet(sessao.lojaId);
  return NextResponse.json({ ok: true, digitando });
}

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ativo = Boolean(body?.ativo);
  const resultado = await digitandoLojaSet(sessao.lojaId, ativo);
  return NextResponse.json(resultado);
}
