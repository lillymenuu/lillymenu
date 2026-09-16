import { NextResponse } from "next/server";
import { storePhpFetch, StoreApiError } from "@/lib/store/api";
import type { StoreComboDetalhe } from "@/lib/store/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const lojaId = url.searchParams.get("loja_id");

  if (!id || !lojaId) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  try {
    const data = await storePhpFetch<StoreComboDetalhe & { ok: true }>(
      `/public/api/combo_detalhe.php?id=${encodeURIComponent(id)}&loja_id=${encodeURIComponent(lojaId)}`
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    const msg = e instanceof StoreApiError ? e.message : "Erro ao falar com a loja.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
