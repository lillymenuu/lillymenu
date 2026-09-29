import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cobrancas } from "@/db/schema";
import { mpValidarAssinaturaWebhook, mpConsultarPagamento } from "@/db/queries/mercadopago";
import { confirmarPagamentoAssinatura } from "@/db/queries/pagamentoPix";

/*
 * Equivalente de admin/api/mercadopago_webhook.php: webhook publico do Mercado Pago,
 * sem sessao (chamado pelo servidor do MP, nao por um admin logado). So funciona em
 * producao (localhost nao e publico); o fallback pra dev e o polling em pix-status.
 * Responde sempre 200 pra evitar retry-storm do MP, mesmo quando ignora a notificacao.
 */
export async function POST(request: Request) {
  const xSignature = request.headers.get("x-signature") ?? "";
  const xRequestId = request.headers.get("x-request-id") ?? "";

  const url = new URL(request.url);
  let dataId = url.searchParams.get("data_id") ?? url.searchParams.get("id") ?? "";

  if (dataId === "") {
    const payload = await request.json().catch(() => null);
    dataId = String(payload?.data?.id ?? "");
  }

  if (dataId === "" || !(await mpValidarAssinaturaWebhook(xSignature, xRequestId, dataId))) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  // Nunca confia em valores do corpo do webhook pra liberar acesso — reconsulta a API.
  const pagamento = await mpConsultarPagamento(dataId);
  if (!pagamento || pagamento.status !== "approved") {
    return NextResponse.json({ ok: true, aprovado: false });
  }

  const [cobrancaExistente] = await db.select({ id: cobrancas.id }).from(cobrancas).where(eq(cobrancas.mp_payment_id, dataId)).limit(1);
  let cobrancaId = cobrancaExistente?.id ?? 0;

  if (!cobrancaId) {
    const externalRef = Number(pagamento.external_reference ?? 0);
    if (externalRef > 0) cobrancaId = externalRef;
  }

  if (cobrancaId > 0) {
    await confirmarPagamentoAssinatura(cobrancaId, dataId);
  }

  return NextResponse.json({ ok: true });
}
