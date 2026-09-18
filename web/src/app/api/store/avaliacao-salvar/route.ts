import { NextResponse } from "next/server";
import { storePhpFetch, storeFormBody, StoreApiError } from "@/lib/store/api";

export async function POST(request: Request) {
  const body = await request.formData().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, msg: "Corpo invalido" }, { status: 400 });
  }

  const pedidoId = body.get("pedido_id");
  const nota = body.get("nota");
  const descricao = body.get("descricao");
  const lojaId = body.get("loja_id");

  if (!pedidoId || !nota) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  try {
    const data = await storePhpFetch<{ ok: boolean; msg?: string }>("/public/api/avaliacao_salvar.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: storeFormBody({
        pedido_id: String(pedidoId),
        nota: String(nota),
        descricao: descricao ? String(descricao) : "",
        loja_id: lojaId ? String(lojaId) : undefined,
      }),
    });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    const msg = e instanceof StoreApiError ? e.message : "Erro ao falar com a loja.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
