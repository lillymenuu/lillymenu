import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { atualizarStatusOrcamento } from "@/db/queries/orcamentos";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  const status = typeof body?.status === "string" ? body.status : "";

  const resultado = await atualizarStatusOrcamento(sessao.lojaId, id, status);
  return NextResponse.json(resultado);
}
