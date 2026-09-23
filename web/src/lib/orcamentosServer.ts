import "server-only";
import { listarOrcamentos } from "@/db/queries/orcamentos";
import type { OrcamentosListarResposta, OrcamentoStatus } from "@/lib/orcamentos";

export async function getOrcamentos(lojaId: number): Promise<OrcamentosListarResposta> {
  const orcamentos = await listarOrcamentos(lojaId, "");
  return {
    ok: true,
    orcamentos: orcamentos.map((o) => ({ id: o.id, status: o.status as OrcamentoStatus, cliente_nome: o.clienteNome, total: o.total, itens_count: o.itensCount, criado_em: o.criadoEm, atualizado_em: o.atualizadoEm })),
  };
}
