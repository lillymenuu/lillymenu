import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarTvs } from "@/db/queries/midiaIndoor";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ ok: true, tvs: await listarTvs(sessao.lojaId) });
}
