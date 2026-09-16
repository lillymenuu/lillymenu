import { NextResponse } from "next/server";
import { storePhpFetch, storeFormBody, StoreApiError } from "@/lib/store/api";
import type { StorePedidoCriarResposta } from "@/lib/store/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, msg: "Corpo invalido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (!b.loja_id || !b.itens) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  try {
    const data = await storePhpFetch<(StorePedidoCriarResposta & { ok: true }) | { ok: false; msg: string }>(
      "/public/api/pedido_criar.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: storeFormBody({
          loja_id: b.loja_id as number,
          mesa_id: b.mesa_id as number | undefined,
          cliente_nome: b.cliente_nome as string,
          cliente_telefone: b.cliente_telefone as string,
          tipo: b.tipo as string,
          forma_pagamento: b.forma_pagamento as string,
          endereco: b.endereco as string | undefined,
          subtotal: b.subtotal as number,
          taxa_entrega: b.taxa_entrega as number | undefined,
          total: b.total as number,
          itens: JSON.stringify(b.itens),
          troco_solicitado: b.troco_solicitado as boolean | undefined,
          troco_valor: b.troco_valor as number | undefined,
          cashback_usar: b.cashback_usar as boolean | undefined,
          cashback_valor: b.cashback_valor as number | undefined,
          cupom_codigo: b.cupom_codigo as string | undefined,
          cupom_desconto: b.cupom_desconto as number | undefined,
        }),
      }
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    const msg = e instanceof StoreApiError ? e.message : "Erro ao falar com a loja.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
