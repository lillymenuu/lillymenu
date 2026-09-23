import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarFlyers } from "@/db/queries/promocoes";

function posicao(body: Record<string, unknown>, n: number) {
  return {
    remover: Boolean(Number(body[`flyer_${n}_remover`] ?? 0)),
    base64: typeof body[`flyer_${n}_base64`] === "string" ? (body[`flyer_${n}_base64`] as string) : undefined,
    url: typeof body[`flyer_${n}_url`] === "string" ? (body[`flyer_${n}_url`] as string) : undefined,
  };
}

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const resultado = await salvarFlyers(sessao.lojaId, {
    flyer1: posicao(body, 1),
    flyer2: posicao(body, 2),
    flyer3: posicao(body, 3),
  });

  return NextResponse.json(resultado);
}
