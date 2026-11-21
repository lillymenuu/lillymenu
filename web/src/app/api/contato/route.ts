import { NextResponse } from "next/server";
import { enviarContato } from "@/lib/contato";
import { limitar } from "@/lib/limiteTentativas";

export async function POST(request: Request) {
  const bloqueio = await limitar(request, "contato", { max: 5, janelaSegundos: 3600 });
  if (bloqueio) return bloqueio;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados inválidos." }, { status: 400 });

  const resultado = await enviarContato({
    nome: String(body.nome ?? ""),
    email: String(body.email ?? ""),
    whatsapp: String(body.whatsapp ?? ""),
    assunto: String(body.assunto ?? ""),
    mensagem: String(body.mensagem ?? ""),
  });

  return NextResponse.json(resultado);
}
