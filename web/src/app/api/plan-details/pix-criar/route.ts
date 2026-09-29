import { NextResponse } from "next/server";
import { getSessaoAdminParaCobranca } from "@/lib/session";
import { criarPagamentoPix } from "@/db/queries/pagamentoPix";

export async function POST(request: Request) {
  const sessao = await getSessaoAdminParaCobranca();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const planoId = Number(body?.plano_id ?? 0);
  if (planoId <= 0) return NextResponse.json({ ok: false, msg: "Selecione um plano." }, { status: 400 });

  const resultado = await criarPagamentoPix(sessao.lojaId, sessao.id, planoId);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    cobranca_id: resultado.cobrancaId,
    qr_code: resultado.qrCode,
    qr_code_base64: resultado.qrCodeBase64,
    expira_em: resultado.expiraEm,
    valor: resultado.valor,
  });
}
