import { phpApiFetch } from "@/lib/phpApi";
import type { CuponsListarResposta } from "@/lib/cupons";

export function getCupons() {
  return phpApiFetch<CuponsListarResposta>("/admin/api/v1/cupons_listar.php");
}
