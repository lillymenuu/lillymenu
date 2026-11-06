import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarProdutosParaPerda } from "@/db/queries/desperdicios";

/* Lista leve (sem foto) dos produtos pro modal de lancar perda. */
export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });
  return NextResponse.json({ ok: true, produtos: await listarProdutosParaPerda(sessao.lojaId) });
}
