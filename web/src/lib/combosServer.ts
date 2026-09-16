import { phpApiFetch } from "@/lib/phpApi";
import type { CombosListarResposta } from "@/lib/combos";

export function getCombos() {
  return phpApiFetch<CombosListarResposta>("/admin/api/v1/combo_listar.php");
}
