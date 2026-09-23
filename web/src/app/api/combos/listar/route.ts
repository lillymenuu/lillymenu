import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getCombos } from "@/lib/combosServer";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const data = await getCombos(sessao.lojaId);
  return NextResponse.json(data);
}
