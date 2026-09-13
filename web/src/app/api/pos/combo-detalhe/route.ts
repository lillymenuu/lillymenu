import { NextResponse } from "next/server";
import { phpApiFetchPassthrough, PhpApiError } from "@/lib/phpApi";
import type { PosComboDetalheResposta } from "@/lib/pos";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  try {
    const data = await phpApiFetchPassthrough<PosComboDetalheResposta>(`/admin/api/v1/pdv_combo_detalhe.php?id=${encodeURIComponent(id ?? "")}`);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg: erro }, { status });
  }
}
