import { NextResponse } from "next/server";
import { crossSellSugestoes } from "@/db/queries/crossSellSugestoes";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lojaId = Number(url.searchParams.get("loja_id") ?? "0");
  const produtosIdsRaw = url.searchParams.get("produtos_ids") ?? "";
  const produtosNomesRaw = url.searchParams.get("produtos_nomes") ?? "";

  if (lojaId <= 0) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  const idsCarrinho = produtosIdsRaw
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);

  let nomesExtra: string[] = [];
  if (produtosNomesRaw !== "") {
    try {
      const decodificado = JSON.parse(produtosNomesRaw);
      if (Array.isArray(decodificado)) nomesExtra = decodificado.filter((n): n is string => typeof n === "string" && n !== "");
    } catch {
      /* ignora JSON invalido */
    }
  }

  const resultado = await crossSellSugestoes(lojaId, idsCarrinho, nomesExtra);

  return NextResponse.json({
    ok: true,
    ativo: resultado.ativo,
    produtos: resultado.produtos.map((p) => ({ id: p.id, nome: p.nome, preco: p.preco, imagem: p.imagem, estoque: p.estoque, pontos_ganho: p.pontosGanho })),
  });
}
