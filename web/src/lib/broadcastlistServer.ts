import { phpApiFetch } from "@/lib/phpApi";
import type { BlListarResposta } from "@/lib/broadcastlist";

export function getBlListas() {
  return phpApiFetch<BlListarResposta>("/admin/api/v1/broadcastlist_listar.php");
}
