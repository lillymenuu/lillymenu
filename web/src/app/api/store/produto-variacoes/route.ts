import { NextResponse } from "next/server";
import { storePhpFetch, StoreApiError } from "@/lib/store/api";
import type { StoreProdutoVariacoes } from "@/lib/store/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const produtoId = url.searchParams.get("produto_id");
  const lojaId = url.searchParams.get("loja_id");

  if (!produtoId || !lojaId) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  try {
    const data = await storePhpFetch<StoreProdutoVariacoes & { ok: true }>(
      `/public/api/produto_variacoes.php?produto_id=${encodeURIComponent(produtoId)}&loja_id=${encodeURIComponent(lojaId)}`
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    const msg = e instanceof StoreApiError ? e.message : "Erro ao falar com a loja.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
