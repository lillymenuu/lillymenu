import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";
import type { OrcamentoDetalheResposta } from "@/lib/orcamentos";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await phpApiFetch<OrcamentoDetalheResposta>(`/admin/api/v1/orcamentos_detalhe.php?id=${encodeURIComponent(id)}`);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg: erro }, { status });
  }
}
