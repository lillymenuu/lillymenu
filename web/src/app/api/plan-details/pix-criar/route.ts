import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { criarPagamentoPix } from "@/db/queries/pagamentoPix";

export async function POST() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const resultado = await criarPagamentoPix(sessao.lojaId, sessao.id);
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
