import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { excluirNivelAcesso } from "@/db/queries/permissoesNiveis";

/** Exclui um nivel de acesso personalizado da loja (so se nenhum usuario estiver usando). Body: { id }. */
export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const resultado = await excluirNivelAcesso(sessao.lojaId, sessao.id, sessao.perfil, Number(body?.id ?? 0));
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
}
