import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarMesa } from "@/db/queries/modoGarcom";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  const nome = typeof body?.nome === "string" ? body.nome : "";

  const resultado = await salvarMesa(sessao.lojaId, id, nome);
  return NextResponse.json(resultado);
}
