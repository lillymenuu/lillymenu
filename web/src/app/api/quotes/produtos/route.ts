import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";
import type { OrcamentoProdutosResposta } from "@/lib/orcamentos";

export async function GET() {
  try {
    const data = await phpApiFetch<OrcamentoProdutosResposta>("/admin/api/v1/orcamentos_produtos.php");
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg: erro }, { status });
  }
}
