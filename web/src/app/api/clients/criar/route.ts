import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { criarCliente } from "@/db/queries/clientesAdmin";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await criarCliente(sessao.lojaId, {
    nome: typeof body.nome === "string" ? body.nome : "",
    telefone: typeof body.telefone === "string" ? body.telefone : "",
    aniversario: body.aniversario,
    cep: body.cep,
    rua: body.rua,
    numero: body.numero,
    bairro: body.bairro,
    cidade: body.cidade,
    estado: body.estado,
    complemento: body.complemento,
  });

  return NextResponse.json(resultado);
}
