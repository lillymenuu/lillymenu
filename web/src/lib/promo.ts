import { phpApiFetch } from "@/lib/phpApi";
import type { Produto } from "@/lib/produtos";

export type PromoListarResposta = {
  ok: true;
  produtos: Produto[];
  limite_ativas: number;
  ativas_count: number;
  flyers: string[];
  flyers_ativo: boolean;
};

export function getPromoListar() {
  return phpApiFetch<PromoListarResposta>("/admin/api/v1/promo_listar.php");
}
