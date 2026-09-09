import { phpApiFetch } from "@/lib/phpApi";

export type Categoria = {
  id: number;
  nome: string;
  ativo: number;
  ordem: number | null;
  modo_exibicao?: "vertical" | "horizontal" | "grid";
};

export type Produto = {
  id: number;
  nome: string;
  preco_base: number;
  preco: number;
  ativo: number;
  categoria_id: number | null;
  categoria: string | null;
  estoque_quantidade: number;
  preco_promocional?: number | null;
  promo_desativado?: number;
  imagem?: string | null;
  codigo?: string | null;
  descricao?: string | null;
  apenas_agendamento?: number;
  quantidade_minima?: number;
};

export function getCategorias() {
  return phpApiFetch<{ ok: true; categorias: Categoria[] }>("/admin/api/v1/categorias.php");
}

export function getProdutos() {
  return phpApiFetch<{ ok: true; produtos: Produto[] }>("/admin/api/v1/produtos.php");
}
