import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { unreadLoja } from "@/db/queries/suporteChat";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const unread = await unreadLoja(sessao.lojaId);
  return NextResponse.json({ ok: true, unread });
}
