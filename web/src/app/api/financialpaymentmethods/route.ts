import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarFormasPagamento } from "@/db/queries/financeiroCore";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const formas = await listarFormasPagamento(sessao.lojaId, false);
  return NextResponse.json({ ok: true, formas_pagamento: formas.map((f) => ({ id: f.id, name: f.name, active: f.active })) });
}
