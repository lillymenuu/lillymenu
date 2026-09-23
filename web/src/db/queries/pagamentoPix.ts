import "server-only";
import { and, eq, inArray, desc, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import type { NeonTx } from "@/db";
import { assinaturas, planos, admins, cobrancas, lojas } from "@/db/schema";
import { mpCriarPagamentoPix, mpConsultarPagamento } from "@/db/queries/mercadopago";
import { storageSaveArquivoBase64 } from "@/db/queries/storage";
import { dataFortaleza, timestampFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/pagamento_pix_criar.php, pagamento_pix_status.php
 * e pagamento_comprovante_upload.php (visao do lojista): gerar/consultar Pix
 * de renovacao via Mercado Pago e enviar comprovante manual.
 *
 * A notificacao por WhatsApp do upload de comprovante (whatsEnviarMensagem, no
 * PHP original) fica FORA desta etapa por decisao deliberada: depende do
 * modulo WhatsLilly, ainda nao portado (fora do escopo original desta
 * migracao, listado a parte no checklist).
 */

export async function criarPagamentoPix(lojaId: number, adminId: number): Promise<{ ok: true; cobrancaId: number; qrCode: string; qrCodeBase64: string; expiraEm: string; valor: number } | { ok: false; msg: string }> {
  const [assinatura] = await db.select({ id: assinaturas.id, planoId: assinaturas.plano_id }).from(assinaturas).where(eq(assinaturas.loja_id, lojaId)).orderBy(desc(assinaturas.id)).limit(1);
  if (!assinatura) return { ok: false, msg: "Assinatura nao encontrada." };
  const assinaturaId = assinatura.id;

  const [plano] = await db.select({ nome: planos.nome, valor: planos.valor }).from(planos).where(eq(planos.id, assinatura.planoId ?? 1)).limit(1);
  const planoNome = plano?.nome ?? "Mensal";
  const planoValor = Number(plano?.valor ?? 50);

  const [adminLogado] = await db.select({ email: admins.email }).from(admins).where(eq(admins.id, adminId)).limit(1);
  let emailPagador = (adminLogado?.email ?? "").trim();

  if (emailPagador === "") {
    // Sub-usuario sem e-mail proprio (senha=NULL) — usa o e-mail do admin principal da loja.
    const [fallback] = await db
      .select({ email: admins.email })
      .from(admins)
      .where(and(eq(admins.loja_id, lojaId), sql`${admins.email} is not null and ${admins.email} <> ''`))
      .orderBy(sql`(${admins.senha} is not null) desc`, admins.id)
      .limit(1);
    emailPagador = (fallback?.email ?? "").trim();
  }

  if (emailPagador === "") {
    // Ultimo recurso: MP exige e-mail com formato valido, mas rejeita TLDs reservados como ".local".
    emailPagador = `loja${lojaId}@sememail.com`;
  }

  const [cobrancaExistente] = await db
    .select({ id: cobrancas.id, mpQrCode: cobrancas.mp_qr_code, mpQrCodeBase64: cobrancas.mp_qr_code_base64, mpExpiracao: cobrancas.mp_expiracao, valor: cobrancas.valor })
    .from(cobrancas)
    .where(and(eq(cobrancas.assinatura_id, assinaturaId), inArray(cobrancas.status, ["pendente", "atrasado"])))
    .orderBy(desc(cobrancas.id))
    .limit(1);

  const agora = timestampFortaleza();
  if (cobrancaExistente?.mpQrCode && cobrancaExistente.mpExpiracao && cobrancaExistente.mpExpiracao > agora) {
    return {
      ok: true,
      cobrancaId: cobrancaExistente.id,
      qrCode: cobrancaExistente.mpQrCode,
      qrCodeBase64: cobrancaExistente.mpQrCodeBase64 ?? "",
      expiraEm: cobrancaExistente.mpExpiracao,
      valor: Number(cobrancaExistente.valor),
    };
  }

  let cobrancaId: number;
  if (cobrancaExistente) {
    cobrancaId = cobrancaExistente.id;
  } else {
    const [nova] = await db.insert(cobrancas).values({ assinatura_id: assinaturaId, valor: planoValor, vencimento: dataFortaleza(), status: "pendente", origem: "mercadopago" }).returning({ id: cobrancas.id });
    cobrancaId = nova.id;
  }

  // Chave de idempotencia inclui o timestamp pra cada tentativa ser unica — se
  // usasse so o id da cobranca, o MP devolveria o MESMO Pix (ja expirado) de
  // uma tentativa anterior em vez de gerar um novo de verdade.
  const resultado = await mpCriarPagamentoPix({
    valor: planoValor,
    descricao: `Assinatura LillyMenu - ${planoNome}`,
    emailPagador,
    referenciaExterna: String(cobrancaId),
    chaveIdempotencia: `cobranca_${cobrancaId}_${Date.now()}`,
  });

  if (!resultado.ok) return { ok: false, msg: resultado.erro };

  const expiraEmFormatado = formatarDataHoraDeIso(resultado.expiraEm) ?? timestampFortaleza();

  await db
    .update(cobrancas)
    .set({ origem: "mercadopago", mp_payment_id: resultado.id, mp_qr_code: resultado.qrCode, mp_qr_code_base64: resultado.qrCodeBase64, mp_expiracao: expiraEmFormatado })
    .where(eq(cobrancas.id, cobrancaId));

  return { ok: true, cobrancaId, qrCode: resultado.qrCode ?? "", qrCodeBase64: resultado.qrCodeBase64 ?? "", expiraEm: expiraEmFormatado, valor: planoValor };
}

function formatarDataHoraDeIso(iso: string | null): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${data.getUTCFullYear()}-${pad(data.getUTCMonth() + 1)}-${pad(data.getUTCDate())} ${pad(data.getUTCHours())}:${pad(data.getUTCMinutes())}:${pad(data.getUTCSeconds())}`;
}

export async function consultarStatusPix(lojaId: number, cobrancaId: number): Promise<{ ok: true; pago: boolean } | { ok: false; msg: string }> {
  if (cobrancaId <= 0) return { ok: false, msg: "Dados invalidos." };

  const [cobranca] = await db
    .select({ id: cobrancas.id, status: cobrancas.status, mpPaymentId: cobrancas.mp_payment_id })
    .from(cobrancas)
    .innerJoin(assinaturas, eq(assinaturas.id, cobrancas.assinatura_id))
    .where(and(eq(cobrancas.id, cobrancaId), eq(assinaturas.loja_id, lojaId)))
    .limit(1);
  if (!cobranca) return { ok: false, msg: "Cobranca nao encontrada." };

  if (cobranca.status === "pago") return { ok: true, pago: true };
  if (!cobranca.mpPaymentId) return { ok: true, pago: false };

  const pagamentoMp = await mpConsultarPagamento(cobranca.mpPaymentId);
  if (pagamentoMp && pagamentoMp.status === "approved") {
    await confirmarPagamentoAssinatura(cobrancaId, cobranca.mpPaymentId);
    return { ok: true, pago: true };
  }

  return { ok: true, pago: false };
}

const EXTENSOES_COMPROVANTE = ["jpg", "jpeg", "png", "webp", "pdf"];
const TAMANHO_MAXIMO_COMPROVANTE = 5 * 1024 * 1024;

export async function uploadComprovante(lojaId: number, comprovanteBase64Input: string, comprovanteExtInput: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  const comprovanteBase64 = comprovanteBase64Input.trim();
  const comprovanteExt = comprovanteExtInput.trim().toLowerCase();

  if (comprovanteBase64 === "") return { ok: false, msg: "Selecione um arquivo." };

  const [assinatura] = await db.select({ id: assinaturas.id }).from(assinaturas).where(eq(assinaturas.loja_id, lojaId)).orderBy(desc(assinaturas.id)).limit(1);

  let cobrancaId = 0;
  if (assinatura) {
    const [c] = await db.select({ id: cobrancas.id }).from(cobrancas).where(and(eq(cobrancas.assinatura_id, assinatura.id), inArray(cobrancas.status, ["pendente", "atrasado"]))).orderBy(desc(cobrancas.id)).limit(1);
    cobrancaId = c?.id ?? 0;
  }
  if (cobrancaId <= 0) return { ok: false, msg: "Nenhuma cobranca pendente encontrada." };

  if (!EXTENSOES_COMPROVANTE.includes(comprovanteExt)) return { ok: false, msg: "Arquivo invalido (use JPG, PNG, WebP ou PDF)." };

  const publicPath = await storageSaveArquivoBase64(comprovanteBase64, comprovanteExt, "comprovantes", "comprovante", lojaId, TAMANHO_MAXIMO_COMPROVANTE);
  if (publicPath === null) return { ok: false, msg: "Arquivo invalido ou muito grande (maximo 5MB)." };

  await db.update(cobrancas).set({ comprovante_arquivo: publicPath, comprovante_enviado_em: timestampFortaleza(), motivo_rejeicao: null }).where(eq(cobrancas.id, cobrancaId));

  return { ok: true };
}

/*
 * Confirma o pagamento de uma cobranca e estende a assinatura por 30 dias a
 * partir do vencimento original (nao da data em que foi aprovado — evita dar
 * dias de graca extra quando a aprovacao manual atrasa). Idempotente: chamar
 * de novo pra uma cobranca ja paga nao soma dias de novo. Usada tanto pela
 * confirmacao automatica via Pix (consultarStatusPix) quanto, futuramente,
 * pela aprovacao manual do comprovante no lado do superadmin.
 */
export async function confirmarPagamentoAssinatura(cobrancaId: number, mpPaymentId: string | null = null): Promise<boolean> {
  try {
    return await withTransaction(async (tx: NeonTx) => {
      const [cobranca] = await tx
        .select({ id: cobrancas.id, status: cobrancas.status, vencimento: cobrancas.vencimento, assinaturaId: cobrancas.assinatura_id, lojaId: assinaturas.loja_id })
        .from(cobrancas)
        .innerJoin(assinaturas, eq(assinaturas.id, cobrancas.assinatura_id))
        .where(eq(cobrancas.id, cobrancaId))
        .limit(1);
      if (!cobranca) return false;
      if (cobranca.status === "pago") return true;

      await tx
        .update(cobrancas)
        .set({ status: "pago", pago_em: sql`now()`, mp_payment_id: mpPaymentId ?? sql`${cobrancas.mp_payment_id}` })
        .where(and(eq(cobrancas.id, cobrancaId), sql`${cobrancas.status} != 'pago'`));

      const baseCiclo = cobranca.vencimento || dataFortaleza();
      const cicloFim = somarDiasIso(baseCiclo, 30);
      await tx.update(assinaturas).set({ status: "ativa", ciclo_inicio: baseCiclo, ciclo_fim: cicloFim, bloqueada_em: null }).where(eq(assinaturas.id, cobranca.assinaturaId));
      await tx.update(lojas).set({ ativo: true }).where(eq(lojas.id, cobranca.lojaId));
      await tx.update(admins).set({ ativo: true }).where(eq(admins.loja_id, cobranca.lojaId));

      return true;
    });
  } catch {
    return false;
  }
}

function somarDiasIso(dataISO: string, dias: number): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + dias * 86_400_000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
