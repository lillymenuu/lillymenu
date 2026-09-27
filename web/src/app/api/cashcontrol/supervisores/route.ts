import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarSupervisores } from "@/db/queries/caixa";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const itens = await listarSupervisores(sessao.lojaId);
  return NextResponse.json({ ok: true, itens });
}
