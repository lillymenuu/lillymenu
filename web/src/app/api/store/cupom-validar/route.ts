import { NextResponse } from "next/server";
import { storePhpFetch, storeFormBody, StoreApiError } from "@/lib/store/api";
import type { StoreCupomResultado } from "@/lib/store/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, msg: "Corpo invalido" }, { status: 400 });
  }

  const { loja_id, codigo, subtotal, tipo, taxa, cliente_id, telefone } = body as Record<string, unknown>;
  if (!loja_id || !codigo) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  try {
    const data = await storePhpFetch<(StoreCupomResultado & { ok: true }) | { ok: false; msg: string }>(
      "/public/api/cupons_validar.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: storeFormBody({
          loja_id: loja_id as number,
          codigo: codigo as string,
          subtotal: subtotal as number | undefined,
          tipo: tipo as string | undefined,
          taxa: taxa as number | undefined,
          cliente_id: cliente_id as number | undefined,
          telefone: telefone as string | undefined,
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
