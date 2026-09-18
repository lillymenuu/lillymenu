import { NextResponse } from "next/server";
import { storePhpFetch, StoreApiError } from "@/lib/store/api";
import type { StorePontosProdutosResposta } from "@/lib/store/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lojaId = url.searchParams.get("loja_id");

  if (!lojaId) {
    return NextResponse.json({ ok: false, produtos: [] });
  }

  try {
    const data = await storePhpFetch<StorePontosProdutosResposta>(`/public/api/pontos_produtos.php?loja_id=${encodeURIComponent(lojaId)}`);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    return NextResponse.json({ ok: false, produtos: [] }, { status });
  }
}
