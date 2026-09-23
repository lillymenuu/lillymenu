import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { trocarPlano } from "@/db/queries/assinatura";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await trocarPlano(sessao.lojaId, sessao.id, Number(body.plano_id ?? 0));
  if (!resultado.ok) return NextResponse.json(resultado);
  return NextResponse.json({ ok: true, plano_nome: resultado.planoNome });
}
