import "server-only";
import { listarPromocoes } from "@/db/queries/promocoes";
import type { Produto } from "@/lib/produtos";

export type PromoListarResposta = {
  ok: true;
  produtos: Produto[];
  limite_ativas: number;
  ativas_count: number;
  flyers: string[];
  flyers_ativo: boolean;
};

export async function getPromoListar(lojaId: number): Promise<PromoListarResposta> {
  const resultado = await listarPromocoes(lojaId);
  return {
    ok: true,
    produtos: resultado.produtos.map((p) => ({
      id: p.id,
      nome: p.nome ?? "",
      preco_base: 0,
      preco: p.preco ?? 0,
      ativo: 1,
      estoque_quantidade: 0,
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
  };
}
