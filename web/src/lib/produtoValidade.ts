/*
 * Funcao pura, sem dependencia de server-only (lib/produtos.ts importa
 * phpApiFetch, que so pode rodar em Server Component/Route Handler —
 * separada aqui pra poder ser usada direto em componentes client, como
 * o card de produto). Mesma janela de 2 dias usada pelo aviso de prazo
 * de validade (admin/api/v1/produtos_validade_check.php) — inclui
 * produtos ja vencidos (diferenca negativa).
 */
export function produtoProximoValidade(dataValidade: string | null | undefined): boolean {
  if (!dataValidade) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(`${dataValidade}T00:00:00`);
  if (Number.isNaN(validade.getTime())) return false;
  const diffDias = Math.round((validade.getTime() - hoje.getTime()) / 86400000);
  return diffDias <= 2;
}
