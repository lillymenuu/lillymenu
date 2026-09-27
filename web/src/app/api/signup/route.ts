import { NextResponse } from "next/server";
import { criarContaLoja } from "@/db/queries/signup";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados inválidos." }, { status: 400 });

  const resultado = await criarContaLoja({
    nome: String(body.nome ?? ""),
    empresa: String(body.empresa ?? ""),
    email: String(body.email ?? ""),
    whatsapp: String(body.whatsapp ?? ""),
    planoSlug: String(body.plano_slug ?? ""),
    faturamento: typeof body.faturamento === "string" ? body.faturamento : undefined,
    segmento: typeof body.segmento === "string" ? body.segmento : undefined,
  });

  return NextResponse.json(resultado);
}
