import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { statusCrossSell } from "@/db/queries/crossSellStatus";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const resultado = await statusCrossSell(sessao.lojaId);

  return NextResponse.json({
    ok: true,
    ativo: resultado.ativo,
    faturamento_extra: resultado.faturamentoExtra,
    grupos: resultado.grupos.map((g) => ({ categoria: g.categoria, total_produtos: g.totalProdutos, exemplos: g.exemplos })),
  });
}
