import "server-only";
import { listarCombos } from "@/db/queries/combosAdmin";
import type { CombosListarResposta } from "@/lib/combos";

export async function getCombos(lojaId: number): Promise<CombosListarResposta> {
  const combos = await listarCombos(lojaId);
  return {
    ok: true,
    combos: combos.map((c) => ({
      id: c.id,
      nome: c.nome,
      imagem: c.imagem,
      categoria_id: c.categoriaId,
      tipo_preco: c.tipoPreco,
      preco: c.preco,
      preco_promocional: c.precoPromocional,
      promo_desativado: c.promoDesativado ? 1 : 0,
      ativo: c.ativo ? 1 : 0,
    })),
  };
}
