import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarCupom } from "@/db/queries/cuponsAdmin";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await salvarCupom(sessao.lojaId, {
    id: Number(body.id ?? 0) > 0 ? Number(body.id) : undefined,
    codigo: typeof body.codigo === "string" ? body.codigo : "",
    tipo: typeof body.tipo === "string" ? body.tipo : undefined,
    desconto: body.desconto,
    minimo: body.minimo,
    quantidadeTotal: body.quantidade_total,
    ativo: Boolean(body.ativo),
    primeiraCompra: Boolean(body.primeira_compra),
    publico: Boolean(body.publico),
  });

  return NextResponse.json(resultado);
}
