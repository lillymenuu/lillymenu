import { NextResponse } from "next/server";
import { storePhpFetch, StoreApiError } from "@/lib/store/api";
import type { StorePedidosClienteResposta } from "@/lib/store/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tel = url.searchParams.get("tel");
  const lojaId = url.searchParams.get("loja_id");

  if (!tel || !lojaId) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" });
  }

  try {
    const data = await storePhpFetch<StorePedidosClienteResposta>(
      `/public/api/pedidos_por_cliente.php?tel=${encodeURIComponent(tel)}&loja_id=${encodeURIComponent(lojaId)}`
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    const msg = e instanceof StoreApiError ? e.message : "Erro ao falar com a loja.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
