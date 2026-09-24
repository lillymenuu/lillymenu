import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarTaxaBairro } from "@/db/queries/taxasEntrega";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await salvarTaxaBairro(sessao.lojaId, {
    id: body.id ? Number(body.id) : undefined,
    bairro: String(body.bairro ?? ""),
    taxa: body.taxa ?? 0,
    tempoMin: body.tempo_min ?? null,
    tempoMax: body.tempo_max ?? null,
  });

  return NextResponse.json(resultado);
}
