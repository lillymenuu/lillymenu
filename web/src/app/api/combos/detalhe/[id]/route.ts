import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheCombo } from "@/db/queries/combosAdmin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { id } = await params;
  const resultado = await detalheCombo(sessao.lojaId, Number(id));
  if (!resultado.ok) return NextResponse.json(resultado);

  const { combo, passos } = resultado;
  return NextResponse.json({
    ok: true,
    combo: {
      id: combo.id,
      nome: combo.nome,
      descricao: combo.descricao,
      imagem: combo.imagem,
      tipo_preco: combo.tipoPreco,
      preco: combo.preco,
      preco_promocional: combo.precoPromocional,
      promo_desativado: combo.promoDesativado ? 1 : 0,
      ativo: combo.ativo ? 1 : 0,
      categoria_id: combo.categoriaId,
    },
    passos: passos.map((p) => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      obrigatorio: p.obrigatorio ? 1 : 0,
      min_itens: p.minItens,
      max_itens: p.maxItens,
      permite_repetir: p.permiteRepetir ? 1 : 0,
      opcoes: p.opcoes.map((o) => ({ id: o.id, nome: o.nome, preco: o.preco, imagem: o.imagem, estoque: o.estoque, esgotado: o.esgotado })),
    })),
  });
}
