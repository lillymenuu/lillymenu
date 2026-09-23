import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheCombo } from "@/db/queries/comboDetalhe";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id") ?? "0");
  const resultado = await detalheCombo(sessao.lojaId, id);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    combo: {
      id: resultado.combo.id,
      nome: resultado.combo.nome,
      descricao: resultado.combo.descricao,
      preco: resultado.combo.preco,
      tipo_preco: resultado.combo.tipoPreco,
    },
    passos: resultado.passos.map((p) => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      min_itens: p.minItens,
      max_itens: p.maxItens,
      obrigatorio: p.obrigatorio,
      permite_repetir: p.permiteRepetir,
      opcoes: p.opcoes.map((o) => ({ id: o.id, nome: o.nome, preco: o.preco, imagem: o.imagem, estoque: o.estoque, esgotado: o.esgotado })),
    })),
  });
}
