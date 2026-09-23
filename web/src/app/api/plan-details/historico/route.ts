import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { historicoAssinatura } from "@/db/queries/assinatura";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const linhas = await historicoAssinatura(sessao.lojaId);

  return NextResponse.json({
    ok: true,
    transacoes: linhas.map((t) => ({ id: t.id, valor: t.valor, status: t.status, origem: t.origem, vencimento: t.vencimento, pago_em: t.pagoEm, criado_em: t.criadoEm })),
  });
}
