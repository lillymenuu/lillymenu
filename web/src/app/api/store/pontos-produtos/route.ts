import { NextResponse } from "next/server";
import { produtosResgataveisPorPontos } from "@/db/queries/pontos";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lojaId = Number(url.searchParams.get("loja_id") ?? "0");

  if (lojaId <= 0) {
    return NextResponse.json({ ok: false, produtos: [] });
  }

  const baseUrl = `${url.protocol}//${url.host}/`;
  const produtos = await produtosResgataveisPorPontos(lojaId, baseUrl);

  return NextResponse.json({
    ok: true,
    produtos: produtos.map((p) => ({ id: p.id, nome: p.nome, descricao: p.descricao, pontos_custo: p.pontosCusto, imagem: p.imagem ?? "", pontos_ganho: p.pontosGanho, categoria: p.categoria })),
  });
}
