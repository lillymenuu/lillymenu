export type FinanceiroCategoria = {
  id: number;
  name: string;
  type: "income" | "expense";
  parent_id: number | null;
  parent_name: string | null;
  active: boolean;
};

export type FinanceiroCategoriasResposta = {
  ok: true;
  tipo: "" | "income" | "expense";
  categorias: FinanceiroCategoria[];
};
