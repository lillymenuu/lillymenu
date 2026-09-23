import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarPromocoes } from "@/db/queries/promocoes";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const resultado = await listarPromocoes(sessao.lojaId);
  return NextResponse.json({
    ok: true,
    produtos: resultado.produtos.map((p) => ({
      id: p.id,
      nome: p.nome,
      preco: p.preco,
      categoria_id: p.categoriaId,
      categoria: p.categoria,
      preco_promocional: p.precoPromocional,
      promo_desativado: p.promoDesativado ? 1 : 0,
      promo_dias: p.promoDias,
      promo_inicio: p.promoInicio,
      promo_imagem: p.promoImagem,
      promo_descricao: p.promoDescricao,
      promo_etiqueta: p.promoEtiqueta,
      imagem: p.imagem,
      em_promo: p.emPromo,
      dias_restantes: p.diasRestantes,
    })),
    limite_ativas: resultado.limiteAtivas,
    ativas_count: resultado.ativasCount,
    flyers: resultado.flyers,
    flyers_ativo: resultado.flyersAtivo,
  });
}
