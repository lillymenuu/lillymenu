import { NextResponse } from "next/server";
import { phpApiFetchPassthrough, PhpApiError } from "@/lib/phpApi";
import type { PosCepLookupResposta } from "@/lib/pos";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cep = searchParams.get("cep") ?? "";
  try {
    const data = await phpApiFetchPassthrough<PosCepLookupResposta>(`/admin/api/v1/pdv_cep_lookup.php?cep=${encodeURIComponent(cep)}`);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg: erro }, { status });
  }
}
