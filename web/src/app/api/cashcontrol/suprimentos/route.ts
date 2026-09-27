import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarSuprimentosCaixaAberto } from "@/db/queries/caixa";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const itens = await listarSuprimentosCaixaAberto(sessao.lojaId);
  return NextResponse.json({
    ok: true,
    itens: itens.map((i) => ({
      id: i.id,
      caixa_id: i.caixaId,
      tipo: i.tipo,
      valor: i.valor,
      motivo: i.motivo,
      observacoes: i.observacoes,
      operador: i.operador,
      autorizado_por: i.autorizadoPor,
      criado_em: i.criadoEm,
    })),
  });
}
