import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarReservaPdv } from "@/db/queries/pdvReservas";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const sessaoReserva = String(body.sessao ?? "");
  const itensRaw: { produto_id: number; qtd: number }[] = Array.isArray(body.itens) ? body.itens : [];
  const itens = new Map<number, number>();
  for (const i of itensRaw) {
    const produtoId = Number(i.produto_id);
    const qtd = Number(i.qtd);
    if (produtoId > 0 && qtd > 0) itens.set(produtoId, (itens.get(produtoId) ?? 0) + qtd);
  }

  await salvarReservaPdv(sessao.lojaId, sessaoReserva, itens);
  return NextResponse.json({ ok: true });
}
