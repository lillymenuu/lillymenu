import { NextResponse } from "next/server";
import { storePhpFetch, storeFormBody, StoreApiError } from "@/lib/store/api";
import type { StorePontosResgatarResposta } from "@/lib/store/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, msg: "Corpo invalido" }, { status: 400 });
  }

  const { cliente_id, produto_id, loja_id } = body as Record<string, unknown>;
  if (!cliente_id || !produto_id || !loja_id) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  try {
    const data = await storePhpFetch<StorePontosResgatarResposta>("/public/api/pontos_resgatar.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: storeFormBody({
        cliente_id: cliente_id as number,
        produto_id: produto_id as number,
        loja_id: loja_id as number,
        apenas_validar: 1,
      }),
    });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    const msg = e instanceof StoreApiError ? e.message : "Erro ao falar com a loja.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
