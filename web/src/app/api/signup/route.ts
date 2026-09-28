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
    senha: String(body.senha ?? ""),
    cpfCnpj: String(body.cpf_cnpj ?? ""),
    cep: typeof body.cep === "string" ? body.cep : undefined,
    rua: typeof body.rua === "string" ? body.rua : undefined,
    numero: typeof body.numero === "string" ? body.numero : undefined,
    bairro: typeof body.bairro === "string" ? body.bairro : undefined,
    cidade: typeof body.cidade === "string" ? body.cidade : undefined,
    estado: typeof body.estado === "string" ? body.estado : undefined,
    faturamento: typeof body.faturamento === "string" ? body.faturamento : undefined,
    segmento: typeof body.segmento === "string" ? body.segmento : undefined,
  });

  return NextResponse.json(resultado);
}
