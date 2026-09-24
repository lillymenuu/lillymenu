import { NextResponse } from "next/server";
import { detalheCombo } from "@/db/queries/comboDetalhe";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id") ?? "0");
  const lojaId = Number(url.searchParams.get("loja_id") ?? "0");

  if (id <= 0 || lojaId <= 0) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  const resultado = await detalheCombo(lojaId, id);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    passos: resultado.passos.map((p) => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      obrigatorio: p.obrigatorio ? 1 : 0,
      min_itens: p.minItens,
      max_itens: p.maxItens,
      permite_repetir: p.permiteRepetir ? 1 : 0,
      opcoes: p.opcoes.map((o) => ({ id: o.id, nome: o.nome, imagem: o.imagem ?? "", estoque: o.estoque, esgotado: o.esgotado })),
    })),
  });
}
