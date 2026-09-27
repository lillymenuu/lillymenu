import { NextResponse } from "next/server";
import { criarLeadEspecialista } from "@/db/queries/signup";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados inválidos." }, { status: 400 });

  const resultado = await criarLeadEspecialista({
    nome: String(body.nome ?? ""),
    email: String(body.email ?? ""),
    telefone: String(body.telefone ?? ""),
    empresa: String(body.empresa ?? ""),
    faturamento: typeof body.faturamento === "string" ? body.faturamento : undefined,
    modeloNegocio: typeof body.modelo_negocio === "string" ? body.modelo_negocio : undefined,
    aceiteWhatsapp: Boolean(body.aceite_whatsapp),
  });

  return NextResponse.json(resultado);
}
