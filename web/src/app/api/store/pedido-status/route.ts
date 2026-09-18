import { NextResponse } from "next/server";
import { storePhpFetch, StoreApiError } from "@/lib/store/api";
import type { StorePedidoStatusResposta } from "@/lib/store/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const clienteId = url.searchParams.get("cliente_id");

  if (!id) {
    return NextResponse.json({ ok: false, msg: "ID invalido" });
  }

  try {
    const qs = clienteId ? `&cliente_id=${encodeURIComponent(clienteId)}` : "";
    const data = await storePhpFetch<StorePedidoStatusResposta>(`/public/api/pedido_status.php?id=${encodeURIComponent(id)}${qs}`);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    const msg = e instanceof StoreApiError ? e.message : "Erro ao falar com a loja.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
