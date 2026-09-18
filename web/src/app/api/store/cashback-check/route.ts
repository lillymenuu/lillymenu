import { NextResponse } from "next/server";
import { storePhpFetch, StoreApiError } from "@/lib/store/api";

type CashbackCheckResposta = { ok: boolean; ativo?: boolean; saldo: number; saldo_total?: number; pct?: number; clienteId?: number; expira_em?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tel = url.searchParams.get("tel");
  const lojaId = url.searchParams.get("loja_id");

  if (!tel || !lojaId) {
    return NextResponse.json({ ok: false, saldo: 0 });
  }

  try {
    const data = await storePhpFetch<CashbackCheckResposta>(
      `/public/api/cashback_check.php?tel=${encodeURIComponent(tel)}&loja_id=${encodeURIComponent(lojaId)}`
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    return NextResponse.json({ ok: false, saldo: 0 }, { status });
  }
}
