import { phpApiFetch } from "@/lib/phpApi";

export type EstoqueItem = {
  id: number;
  nome: string;
  quantidade: number;
};

export function getEstoqueListar() {
  return phpApiFetch<{ ok: true; itens: EstoqueItem[] }>("/admin/api/v1/estoque_listar.php");
}
