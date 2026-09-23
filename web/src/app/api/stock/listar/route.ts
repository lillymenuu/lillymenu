import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarEstoque } from "@/db/queries/estoqueAdmin";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const itens = await listarEstoque(sessao.lojaId);
  return NextResponse.json({ ok: true, itens: itens.map((i) => ({ id: i.id, nome: i.nome ?? "", quantidade: i.quantidade })) });
}
