import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { totalNaoLidas } from "@/db/queries/whatsLilly";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const total = await totalNaoLidas(sessao.lojaId);
  return NextResponse.json({ ok: true, total_nao_lidas: total });
}
