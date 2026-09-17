import { NextResponse } from "next/server";
import { storePhpFetch, StoreApiError } from "@/lib/store/api";
import type { StoreCrossSellProduto } from "@/lib/store/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lojaId = url.searchParams.get("loja_id");
  const produtosIds = url.searchParams.get("produtos_ids") ?? "";
  const produtosNomes = url.searchParams.get("produtos_nomes") ?? "";

  if (!lojaId) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  try {
    const qs = new URLSearchParams({
      loja_id: lojaId,
      produtos_ids: produtosIds,
      produtos_nomes: produtosNomes,
    });
    const data = await storePhpFetch<{ ok: true; ativo: boolean; produtos: StoreCrossSellProduto[] }>(
      `/public/api/cross_sell_sugestoes.php?${qs.toString()}`
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    const msg = e instanceof StoreApiError ? e.message : "Erro ao falar com a loja.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
