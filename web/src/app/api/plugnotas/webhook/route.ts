import { NextResponse } from "next/server";
import { atualizarStatusNotaFiscal } from "@/db/queries/nfce";

/*
 * Webhook publico do PlugNotas (sem sessao — chamado pelo servidor deles).
 * O cadastro do webhook (POST /empresa/{cnpj}/webhook) inclui um header
 * Authorization fixo que validamos aqui; nunca confiamos no status do corpo,
 * sempre reconsultamos a API (atualizarStatusNotaFiscal -> GET /resumo) antes
 * de gravar. Responde sempre 200 pra evitar retry-storm do PlugNotas.
 */
export async function POST(request: Request) {
  const token = (process.env.PLUGNOTAS_WEBHOOK_TOKEN ?? "").trim();
  if (token && request.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const payload = await request.json().catch(() => null);
  const idIntegracao = Number(payload?.idIntegracao ?? payload?.data?.idIntegracao);
  if (!idIntegracao) return NextResponse.json({ ok: true, ignorado: true });

  await atualizarStatusNotaFiscal(idIntegracao);
  return NextResponse.json({ ok: true });
}
