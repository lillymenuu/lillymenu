import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { definirBloqueioCliente } from "@/db/queries/clientesAdmin";

/** Bloqueia ou desbloqueia o cliente da loja logada. Body: { id, bloquear }. */
export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await definirBloqueioCliente(sessao.lojaId, Number(body.id ?? 0), body.bloquear === true);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
}
