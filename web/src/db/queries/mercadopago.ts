import "server-only";

/*
 * Equivalente de admin/helpers/mercadopago.php: chamadas diretas a API do
 * Mercado Pago (Pix). Sem "server-only" nas funcoes de assinatura de
 * webhook seria ok, mas o arquivo inteiro so faz sentido no servidor.
 */

export type ResultadoPixMp = { ok: true; id: string | null; qrCode: string | null; qrCodeBase64: string | null; expiraEm: string | null } | { ok: false; erro: string };

export type DadosPix = { valor: number; descricao: string; emailPagador: string; referenciaExterna: string; chaveIdempotencia: string };

/** Cria uma cobranca Pix na API do Mercado Pago. */
export async function mpCriarPagamentoPix(dados: DadosPix): Promise<ResultadoPixMp> {
  const accessToken = (process.env.MP_ACCESS_TOKEN ?? "").trim();
  if (accessToken === "") return { ok: false, erro: "Mercado Pago nao configurado (MP_ACCESS_TOKEN ausente)." };

  // Mercado Pago exige ISO-8601 completo com milissegundos. 2h de folga pra
  // loja nao correr risco de escanear o Pix e o banco recusar por "expirado"
  // antes de dar tempo de concluir o pagamento.
  const expiraDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const expiraEm = formatarIso8601ComOffset(expiraDate);

  const body = {
    transaction_amount: dados.valor,
    description: dados.descricao,
    payment_method_id: "pix",
    external_reference: dados.referenciaExterna,
    date_of_expiration: expiraEm,
    payer: { email: dados.emailPagador },
  };

  let resp: Response;
  try {
    resp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": dados.chaveIdempotencia,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return { ok: false, erro: `Erro de conexao com o Mercado Pago: ${e instanceof Error ? e.message : String(e)}` };
  }

  const respData = await resp.json().catch(() => null);

  if (!resp.ok) {
    const motivo = respData?.message ?? (await resp.text().catch(() => ""));
    return { ok: false, erro: `Mercado Pago retornou HTTP ${resp.status}: ${typeof motivo === "string" ? motivo : JSON.stringify(motivo)}` };
  }

  const transacao = respData?.point_of_interaction?.transaction_data ?? {};

  return {
    ok: true,
    id: respData?.id !== undefined ? String(respData.id) : null,
    qrCode: transacao.qr_code ?? null,
    qrCodeBase64: transacao.qr_code_base64 ?? null,
    expiraEm: respData?.date_of_expiration ?? expiraEm,
  };
}

/** Consulta o status atual de um pagamento direto na API do Mercado Pago — nunca confiar em valores vindos do webhook sem reconsultar. */
export async function mpConsultarPagamento(paymentId: string): Promise<Record<string, unknown> | null> {
  const accessToken = (process.env.MP_ACCESS_TOKEN ?? "").trim();
  if (accessToken === "" || paymentId === "") return null;

  try {
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) return null;
    const data = await resp.json().catch(() => null);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

/** Valida a assinatura do webhook do Mercado Pago (header x-signature: "ts=...,v1=...", + x-request-id). */
export async function mpValidarAssinaturaWebhook(xSignature: string, xRequestId: string, dataId: string): Promise<boolean> {
  const webhookSecret = (process.env.MP_WEBHOOK_SECRET ?? "").trim();
  if (webhookSecret === "" || xSignature === "") return false;

  const partes: Record<string, string> = {};
  for (const parte of xSignature.split(",")) {
    const idx = parte.indexOf("=");
    if (idx === -1) continue;
    partes[parte.slice(0, idx).trim()] = parte.slice(idx + 1).trim();
  }
  const ts = partes.ts ?? "";
  const v1 = partes.v1 ?? "";
  if (ts === "" || v1 === "") return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const { createHmac, timingSafeEqual } = await import("crypto");
  const calculado = createHmac("sha256", webhookSecret).update(manifest).digest("hex");

  const bufCalculado = Buffer.from(calculado, "utf8");
  const bufV1 = Buffer.from(v1, "utf8");
  if (bufCalculado.length !== bufV1.length) return false;
  return timingSafeEqual(bufCalculado, bufV1);
}

/** "2026-08-10T15:57:00.000-03:00" — ISO-8601 com milissegundos e offset, formato exigido pelo Mercado Pago. */
function formatarIso8601ComOffset(data: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(data);
  const p: Record<string, string> = {};
  for (const parte of partes) p[parte.type] = parte.value;
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.000-03:00`;
}
