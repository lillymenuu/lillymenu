import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheTransacao } from "@/db/queries/assinatura";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const cobrancaId = Number(request.nextUrl.searchParams.get("cobranca_id") ?? "0");
  const resultado = await detalheTransacao(sessao.lojaId, sessao.id, cobrancaId);
  if (!resultado.ok) return NextResponse.json(resultado);

  const t = resultado.transacao;
  return NextResponse.json({
    ok: true,
    transacao: { id: t.id, valor: t.valor, status: t.status, origem: t.origem, vencimento: t.vencimento, pago_em: t.pagoEm, criado_em: t.criadoEm },
    pagador: resultado.pagador,
  });
}
