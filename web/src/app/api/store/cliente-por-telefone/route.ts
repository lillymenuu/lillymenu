import { NextResponse } from "next/server";
import { buscarClienteLojaPorTelefone } from "@/db/queries/storeCliente";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tel = url.searchParams.get("tel") ?? "";
  const lojaId = Number(url.searchParams.get("loja_id") ?? "0");

  if (!tel || lojaId <= 0) return NextResponse.json({ ok: false, encontrado: false });

  const cliente = await buscarClienteLojaPorTelefone(lojaId, tel);
  if (!cliente) return NextResponse.json({ ok: true, encontrado: false });

  return NextResponse.json({ ok: true, encontrado: true, nome: cliente.nome, aniversario: cliente.aniversario ?? "" });
}
