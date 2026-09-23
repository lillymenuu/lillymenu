import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarPassoCombo } from "@/db/queries/combosAdmin";

function parseIdsCsv(value: unknown): number[] {
  if (typeof value !== "string" || value.trim() === "") return [];
  return value
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await salvarPassoCombo(sessao.lojaId, {
    passoId: Number(body.passo_id ?? 0) > 0 ? Number(body.passo_id) : undefined,
    comboId: Number(body.combo_id ?? 0),
    nome: typeof body.nome === "string" ? body.nome : "",
    descricao: typeof body.descricao === "string" ? body.descricao : undefined,
    obrigatorio: body.obrigatorio === undefined ? undefined : Boolean(Number(body.obrigatorio)),
    minItens: Number(body.min_itens ?? 1),
    maxItens: Number(body.max_itens ?? 1),
    permiteRepetir: Boolean(Number(body.permite_repetir ?? 0)),
    produtoIds: parseIdsCsv(body.produto_ids),
  });

  if (!resultado.ok) return NextResponse.json(resultado);
  return NextResponse.json({ ok: true, passo_id: resultado.passoId });
}
