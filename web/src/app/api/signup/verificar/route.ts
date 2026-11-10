import { NextResponse } from "next/server";
import { verificarDuplicidadeCadastro } from "@/db/queries/signup";

/* Usado pelo cadastro da landing ao sair dos campos: avisa na hora se e-mail, telefone ou CPF/CNPJ ja tem conta.
   O bloqueio de verdade fica em criarContaLoja(), que confere de novo ao enviar. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados inválidos." }, { status: 400 });

  const duplicado = await verificarDuplicidadeCadastro({
    email: typeof body.email === "string" ? body.email : undefined,
    whatsapp: typeof body.whatsapp === "string" ? body.whatsapp : undefined,
    cpfCnpj: typeof body.cpf_cnpj === "string" ? body.cpf_cnpj : undefined,
  });

  return NextResponse.json({ ok: true, duplicado });
}
