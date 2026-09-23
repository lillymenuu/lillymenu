import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { produtosValidadeCheck } from "@/db/queries/produtosAdmin";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const avisos = await produtosValidadeCheck(sessao.lojaId);
  return NextResponse.json({
    ok: true,
    produtos: avisos.map((a) => ({ id: a.id, nome: a.nome, data_validade: a.dataValidade, dias_restantes: a.diasRestantes, vencido: a.vencido })),
  });
}
