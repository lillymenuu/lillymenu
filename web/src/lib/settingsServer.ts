import { phpApiFetch } from "@/lib/phpApi";
import type { ConfiguracoesDetalhe } from "@/lib/settings";

export function getConfiguracoesDetalhe() {
  return phpApiFetch<ConfiguracoesDetalhe>("/admin/api/v1/configuracoes_detalhe.php");
}
