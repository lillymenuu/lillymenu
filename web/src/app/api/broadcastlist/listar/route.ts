import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarListas } from "@/db/queries/broadcastList";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const listas = await listarListas(sessao.lojaId);
  return NextResponse.json({ ok: true, listas: listas.map((l) => ({ id: l.id, nome: l.nome, criado_em: l.criadoEm, total_membros: l.totalMembros })) });
}
