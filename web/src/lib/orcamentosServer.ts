import { phpApiFetch } from "@/lib/phpApi";
import type { OrcamentosListarResposta } from "@/lib/orcamentos";

export function getOrcamentos() {
  return phpApiFetch<OrcamentosListarResposta>("/admin/api/v1/orcamentos_listar.php");
}
