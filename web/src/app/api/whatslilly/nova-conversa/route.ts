import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { novaConversa } from "@/db/queries/whatsLilly";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const numero = typeof body?.numero === "string" ? body.numero : "";
  const nome = typeof body?.nome === "string" ? body.nome : "";

  const resultado = await novaConversa(sessao.lojaId, numero, nome);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({ ok: true, conversa_id: resultado.conversaId, nome: resultado.nome });
}
