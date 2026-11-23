import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { reordenarItensCategoria } from "@/db/queries/categoriasAdmin";

function listaIds(v: unknown): number[] {
  return Array.isArray(v) ? v.map((n) => Number(n)).slice(0, 1000) : [];
}

export async function PUT(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const resultado = await reordenarItensCategoria(
    sessao.lojaId,
    Number(body?.categoria_id ?? 0),
    listaIds(body?.produtos),
    listaIds(body?.combos)
  );
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
}
