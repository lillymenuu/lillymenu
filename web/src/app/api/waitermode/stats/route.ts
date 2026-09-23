import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { statsModoGarcom } from "@/db/queries/modoGarcom";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const s = await statsModoGarcom(sessao.lojaId);
  return NextResponse.json({ ok: true, pedidos_pendentes: s.pedidosPendentes, mesas_ativas: s.mesasAtivas, garcons_ativos: s.garconsAtivos });
}
