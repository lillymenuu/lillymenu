import { phpApiFetch } from "@/lib/phpApi";
import type { WlConversasResposta } from "@/lib/whatslilly";

export function getWlConversas() {
  return phpApiFetch<WlConversasResposta>("/admin/api/v1/whatslilly_conversas.php");
}
