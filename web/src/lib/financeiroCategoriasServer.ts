import "server-only";
import { listarCategoriasFinanceiras } from "@/db/queries/financeiroCore";
import type { FinanceiroCategoriasResposta } from "@/lib/financeiroCategorias";

export async function getFinanceiroCategorias(lojaId: number, params?: { tipo?: string }): Promise<FinanceiroCategoriasResposta> {
  const tipoRaw = params?.tipo;
  const tipo = tipoRaw === "income" || tipoRaw === "expense" ? tipoRaw : "";

  const categorias = await listarCategoriasFinanceiras(lojaId, tipo || undefined, false);
  const nomesPorId = new Map(categorias.map((c) => [c.id, c.name]));

  return {
    ok: true,
    tipo,
    categorias: categorias.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parent_id: c.parentId,
      parent_name: c.parentId !== null ? (nomesPorId.get(c.parentId) ?? null) : null,
      active: c.active,
    })),
  };
}
