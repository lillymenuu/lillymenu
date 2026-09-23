import "server-only";
import { listarEstoque } from "@/db/queries/estoqueAdmin";

export type EstoqueItem = {
  id: number;
  nome: string;
  quantidade: number;
};

export async function getEstoqueListar(lojaId: number): Promise<{ ok: true; itens: EstoqueItem[] }> {
  const itens = await listarEstoque(lojaId);
  return { ok: true, itens: itens.map((i) => ({ id: i.id, nome: i.nome ?? "", quantidade: i.quantidade })) };
}
